"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[lib:mysql]");
logger.level = process.env.LOG_LEVEL || "INFO";

const mysql = require("mysql");
const Person = require("../entities/Person");
const Thing = require("../entities/Thing");
const Interaction = require("../entities/Interaction");
const Property = require("../entities/Property");
const Dimension = require("../entities/Dimension");
const Class = require("../entities/Class");

class MySQL {
  /**
   *
   */
  constructor() {
    this.pool = null;
    this.propertyIndexMap = {};
  }

  /**
   * Connect to MySQL server
   **/
  connect(host, user, pass, name) {
    const dbConfig = {
      connectionLimit: 100,
      host: host,
      user: user,
      password: pass,
      database: name,
      multipleStatements: true,
      debug: false,
      insecureAuth: true
    };
    this.pool = mysql.createPool(dbConfig);
  }

  /**
   * Disconnect all connections from the pool.
   */
  disconnect() {
    return this.pool.end();
  }

  /**
   * @param {String} sql - Query to execute
   * @param {Object} data - Data to integrate into the query
   * @return {Promise}
   **/
  exec(sql, data = null) {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((error, connection) => {
        if (error) {
          reject(error);
        }
        const q = connection.query(sql, data, (error, result) => {
          logger.debug(q.sql);
          connection.release();
          if (error !== null) {
            if (error.code === "ER_DUP_ENTRY") {
              reject({ error: 400, message: "Already exists" });
            } else {
              reject({ error: 500, message: "Server Error" });
              logger.error(error + "\n" + q.sql, this.name);
            }
          } else {
            resolve(result);
          }
        });
      });
    });
  }

  /**
   *
   * @param {Thing} thing
   * @return {Promise}
   */
  createThing(thing) {
    const insert = {
      id: thing.id,
      name: thing.name,
      description: thing.description,
      type: thing.type
    };
    const sql = "INSERT INTO `things` SET ?";
    return this.exec(sql, [insert]);
  }

  /**
   *
   * @param {Thing} thing
   * @return {Promise}
   */
  updateThing(thing) {
    const update = {};
    if (thing.name !== undefined) {
      update.name = thing.name;
    }
    if (thing.description !== undefined) {
      update.description = thing.description;
    }
    if (thing.type !== undefined) {
      update.type = thing.type;
    }
    const sql = "UPDATE `things` SET ? \n" + " WHERE `id` = ? ";
    return this.exec(sql, [update, thing.id]);
  }

  /**
   * @param {Property} property
   * @return {Promise}
   */
  updatePropertyValues(property) {
    logger.debug(property.values);
    if (property.values.length === 0) {
      return Promise.resolve();
    }
    const values = property.values;
    let dimensions = null;
    if (this.propertyIndexMap.hasOwnProperty(property.id)) {
      dimensions = this.propertyIndexMap[property.id];
    } else {
      const sqlId =
        "SELECT p.`index_id`," +
        " COUNT(*) AS 'num_dimensions' \n" +
        "FROM `properties` p \n" +
        "  JOIN `dimensions` d" +
        "    ON p.`index_id`=d.`property_index_id` \n" +
        "WHERE p.`id` = ? \n" +
        "GROUP BY p.`index_id`";
      return this.exec(sqlId, [property.id]).then(result => {
        if (result.length !== 1) {
          return Promise.reject("Not Found");
        }
        this.propertyIndexMap[property.id] = {
          index: result[0].index_id,
          num_dimensions: result[0].num_dimensions
        };
        return this.updatePropertyValues(property);
      });
    }

    let sql =
      "INSERT IGNORE INTO `d" +
      dimensions.num_dimensions +
      "` (`property_index_id`, `timestamp`";
    for (let index = 1; index <= dimensions.num_dimensions; index++) {
      sql += ",`value" + index + "`";
    }
    sql += ") VALUES ?";
    let data = [];
    for (let i = 0; i < values.length; i++) {
      let row = [dimensions.index];
      if (values[i].length !== dimensions.num_dimensions + 1) {
        continue;
      }
      data.push(row.concat(values[i]));
    }
    return this.exec(sql, [data]).then(() => {
      return Promise.resolve();
    });
  }

  /**
   * @param {Property} property
   * @return {Promise}
   */
  createProperty(property) {
    const sql = "INSERT INTO `properties` SET ?";
    const insert = {
      id: property.id,
      name: property.name,
      description: property.description,
      type: property.type,
      entity_id: property.entityId
    };
    return this.exec(sql, [insert])
      .then(result => {
        if (
          property.dimensions === undefined ||
          property.dimensions.length === 0
        ) {
          return Promise.resolve(property.id);
        }
        return this.insertDimensions(result.insertId, property.dimensions);
      })
      .then(() => {
        return Promise.resolve(property.id);
      });
  }

  /**
   * @param {Property} property
   * @return {Promise}
   */
  updateProperty(property) {
    const sql = "UPDATE `properties` SET ? \n" + " WHERE `id` = ? ";
    const update = {};
    if (property.name !== undefined) {
      update.name = property.name;
    }
    if (property.description !== undefined) {
      update.description = property.description;
    }
    return this.exec(sql, [update, property.id]);
  }

  /**
   * @param {Person} person
   * @return {Promise}
   */
  createPerson(person) {
    const insert = {
      id: person.id,
      name: person.name,
      password: person.password
    };
    const sql = "INSERT INTO `persons` SET ?";
    return this.exec(sql, [insert]);
  }

  /**
   * @param {Person} person
   * @return {Promise}
   */
  updatePerson(person) {
    const update = {};
    if (person.name !== undefined) {
      update.name = person.name;
    }
    if (person.password !== undefined) {
      update.password = person.password;
    }
    const sql = "UPDATE `persons` SET ? \n" + " WHERE `id` = ? ";
    return this.exec(sql, [update, person.id]);
  }

  /**
   * @param propertyIndexId
   * @param {Dimension[]} dimensions
   * @return {Promise}
   */
  insertDimensions(propertyIndexId, dimensions) {
    const sql =
      "INSERT IGNORE INTO `dimensions`" +
      " (`name`, `description`, `unit`, `property_index_id`) VALUES ?";
    const data = [];
    for (let index = 0; index < dimensions.length; index++) {
      const dim = dimensions[index];
      data.push([dim.name, dim.description, dim.unit, propertyIndexId]);
    }
    return this.exec(sql, [data]);
  }

  /**
   * @param {String} propertyId
   * @param {Class[]} classes
   * @return {Promise}
   */
  insertClasses(propertyId, classes) {
    const sql =
      "INSERT IGNORE INTO `classes`" +
      " (`name`, `description`, `value`, `property_id`) VALUES ?";
    const data = [];
    for (let index = 0; index < classes.length; index++) {
      const clazz = classes[index];
      data.push([clazz.name, clazz.description, clazz.value, propertyId]);
    }
    return this.exec(sql, [data]);
  }

  /**
   * List property classes
   * @param {String} propertyId
   */
  listPropertyClasses(propertyId) {
    const sql =
      "SELECT `name`, `description`, `value`\n" +
      "FROM `classes`\n" +
      +"WHERE `property_id` = ?";
    return this.exec(sql, [propertyId]).then(results => {
      const classes = [];
      results.forEach(data => {
        classes.push(
          new Class(data.name, data.value, propertyId, data.description)
        );
      });
      return Promise.resolve(classes);
    });
  }

  /**
   * @param {String} id
   * @return {*}
   */
  deletePerson(id) {
    const sql = "DELETE FROM `persons` WHERE `id` = ?";
    return this.exec(sql, [id]);
  }

  /**
   * @param {String} id
   * @return {Promise}
   */
  deleteThing(id) {
    const sql = "DELETE FROM `things` WHERE `id` = ?";
    return this.exec(sql, [id]);
  }

  /**
   * @param propertyId
   * @return {Promise}
   */
  deleteProperty(propertyId) {
    const sql = "DELETE FROM `properties` WHERE `id` = ?";
    return this.exec(sql, [propertyId]);
  }

  /**
   * @param {String} entityId
   * @return {Promise<Property[]>}
   */
  listProperties(entityId) {
    const sql =
      "SELECT p.`name` AS 'pname'," +
      " p.`description` AS 'pdesc', p.`type` AS 'ptype', " +
      " p.`registered_at`, p.`id` AS 'property_id', " +
      " d.`name`, d.`description`, d.`unit`, " +
      " c.`name` AS 'cname', c.`description` AS 'cdesc', c.`value` AS 'cvalue'\n" +
      " FROM `properties` p \n" +
      "  JOIN `dimensions` d ON d.`property_index_id` = p.`index_id` \n" +
      "  LEFT JOIN `classes` c ON c.`property_id` = p.`id` \n" +
      " WHERE p.`entity_id` = ? " +
      " ORDER BY `pname`, d.`name`";
    return this.exec(sql, [entityId]).then(results => {
      const properties = {};
      results.forEach(data => {
        const pId = data.property_id;

        // if we did not add this property yet
        if (properties[pId] === undefined) {
          properties[pId] = new Property(
            data.pname,
            data.pdesc,
            data.ptype,
            [],
            [],
            pId
          );
          properties[pId].registeredAt = data.registered_at.getTime();
          properties[pId].entityId = entityId;
        }

        const dimensions = properties[pId].dimensions;
        // if we did not add this dimension yet (none or current different from previous)
        if (
          dimensions.length === 0 ||
          dimensions[dimensions.length - 1].name !== data.name
        ) {
          const dimension = new Dimension(
            data.name,
            data.description,
            data.unit
          );
          properties[pId].addDimension(dimension);
        }

        if (data.cname !== null) {
          properties[pId].addClass(
            new Class(data.cname, data.cvalue, pId, data.cdesc)
          );
        }
      });
      const propArray = [];
      for (let key in properties) {
        if (properties.hasOwnProperty(key)) {
          propArray.push(properties[key]);
        }
      }
      return Promise.resolve(propArray);
    });
  }

  /**
   * @param {String} actorEntityId
   * @return {Promise<Person[]>}
   */
  listPersons(actorEntityId) {
    const sql =
      "SELECT `id`, `name`  \n" +
      "FROM `persons` t\n" +
      "   JOIN `entities_roles` er ON t.`id`=er.`subject_entity_id`\n" +
      "WHERE er.`actor_entity_id` = ?";
    return this.exec(sql, [actorEntityId]).then(result => {
      const persons = [];
      result.forEach(p => {
        persons.push(new Person(p.name, undefined, [], p.id));
      });
      return persons;
    });
  }

  /**
   * @param actorEntityId
   * @return {Promise<Thing[]>}
   */
  listThings(actorEntityId) {
    const sql =
      "SELECT `id`, `name`, `description`, `type` \n" +
      "FROM `things` t\n" +
      "   JOIN `entities_roles` er ON t.`id`=er.`subject_entity_id`\n" +
      "WHERE er.`actor_entity_id` = ?";
    return this.exec(sql, actorEntityId).then(result => {
      const things = [];
      result.forEach(data => {
        things.push(new Thing(data));
      });
      return Promise.resolve(things);
    });
  }

  /**
   * @param {String} personId
   * @return {Promise<Person>}
   */
  readPerson(personId) {
    let sql = "SELECT id, name FROM `persons`\n" + " WHERE `id` = ? ";
    const data = [personId];
    return this.exec(sql, data).then(result => {
      if (result.length === 1) {
        return Promise.resolve(new Person(result[0]));
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {String} personId
   * @param {String} password
   * @return {Promise<Person>}
   */
  checkCredentials(personId, password) {
    let sql =
      "SELECT id, name FROM `persons`\n" + "WHERE `id` = ? AND `password` = ? ";
    const data = [personId, password];
    return this.exec(sql, data).then(result => {
      if (result.length === 1) {
        return Promise.resolve({ valid: true });
      } else {
        return Promise.resolve({ valid: false });
      }
    });
  }

  /**
   * @param {String} thingId
   * @returns {Promise<Thing>}
   */
  readThing(thingId) {
    const sql = "SELECT * FROM `things`\n" + "WHERE `id` = ?";
    return this.exec(sql, thingId).then(result => {
      if (result.length === 1) {
        return Promise.resolve(new Thing(result[0]));
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {Interaction} interaction
   * @return {Promise}
   */
  createInteraction(interaction) {
    const insert = {
      id: interaction.id,
      entity_id_1: interaction.entityId1,
      entity_id_2: interaction.entityId2
    };
    const sql = "INSERT INTO `interactions` SET ?";
    return this.exec(sql, [insert]);
  }

  /**
   * @param actorEntityId
   * @param entityId1
   * @param entityId2
   * @return {Promise<Interaction[]>}
   */
  listInteractions(actorEntityId, entityId1, entityId2) {
    let sql =
      "SELECT `id`, `entity_id_1`, `entity_id_2` \n" +
      "FROM `interactions` i\n" +
      "   JOIN `entities_roles` er\n" +
      "       ON (i.`entity_id_1`=er.`subject_entity_id` " +
      "          OR i.`entity_id_2`=er.`subject_entity_id`)\n" +
      " WHERE er.`actor_entity_id` = ?\n" +
      "   AND (i.`entity_id_1` = ? OR i.`entity_id_2` = ?)\n";
    let data = [actorEntityId, entityId1, entityId1];
    if (entityId2 !== undefined) {
      sql += + "    AND (i.`entity_id_1` = ? OR i.`entity_id_2` = ?)\n";
      data.push(entityId2, entityId2);
    }
    sql += " GROUP BY `id`";
    return this.exec(sql, data).then(result => {
      const interactions = [];
      result.forEach(data => {
        interactions.push(new Interaction(data));
      });
      return Promise.resolve(interactions);
    });
  }

  /**
   * @param {String} interactionId
   * @returns {Promise<Interaction>}
   */
  readInteraction(interactionId) {
    const sql = "SELECT * FROM `interactions`\n" + "WHERE `id` = ?";
    return this.exec(sql, interactionId).then(result => {
      if (result.length === 1) {
        return Promise.resolve(new Interaction(result[0]));
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {String} entityId1
   * @param {String} entityId2
   * @returns {Promise<Interaction>}
   */
  readInteractionByEntityId(entityId1, entityId2) {
    const sql = "SELECT * FROM `interactions`\n"
      + "WHERE (`entity_id_1` = ? AND `entity_id_2` = ?)\n"
      + " OR (`entity_id_2` = ? AND `entity_id_1` = ?)";
    return this.exec(sql, [entityId1, entityId2, entityId1, entityId2]).then(result => {
      if (result.length === 1) {
        return Promise.resolve(new Interaction(result[0]));
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {String} id
   * @return {*}
   */
  deleteInteraction(id) {
    const sql = "DELETE FROM `interactions` WHERE `id` = ?";
    return this.exec(sql, [id]);
  }

  /**
   * @param {String} entityId
   * @param {String} propertyId
   * @return {Promise<Property>}
   */
  readProperty(entityId, propertyId) {
    const sql =
      "SELECT p.`name` AS 'pname'," +
      " p.`description` AS 'pdesc'," +
      " p.`type` AS 'ptype', p.`registered_at`, p.`id`," +
      " d.`name`, d.`description`, d.`unit`\n" +
      "FROM `properties` p JOIN `dimensions` d" +
      " ON p.`index_id` = d.`property_index_id`\n" +
      "WHERE p.`entity_id` = ? AND  p.`id` = ?";
    return this.exec(sql, [entityId, propertyId]).then(results => {
      if (results.length > 0) {
        const data = results[0];
        const dimensions = [];
        for (let index = 0; index < results.length; index++) {
          dimensions.push(
            new Dimension(data.name, data.description, data.unit)
          );
        }
        const property = new Property(
          data.pname,
          data.pdesc,
          data.ptype,
          dimensions,
          [],
          data.id
        );
        property.registeredAt = data.registered_at.getTime();
        return Promise.resolve(property);
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {Property} property
   * @param {int} from
   * @param {int} to
   * @return {Promise<Property>}
   */
  readPropertyValues(property, from, to) {
    let sql = "SELECT `timestamp`";
    let data = [];
    for (let i = 1; i <= property.dimensions.length; i++) {
      sql += ",`value" + i + "`";
    }
    sql += "FROM `d" + property.dimensions.length + "` ";
    sql +=
      " JOIN properties `p` ON p.`index_id` = `d" +
      property.dimensions.length +
      "`.`property_index_id`";
    sql += " WHERE `p`.id = ?";
    data.push(property.id);
    if (from !== undefined && to !== undefined) {
      sql += "AND `timestamp` BETWEEN ? AND ? ORDER BY `timestamp`";
      data.push(from);
      data.push(to);
    } else if (from !== undefined) {
      sql += "AND `timestamp` >= ? ORDER BY `timestamp`";
      data.push(from);
    } else if (to !== undefined) {
      sql += "AND `timestamp` <= ? ORDER BY `timestamp`";
      data.push(to);
    } else {
      sql += "ORDER BY `timestamp` DESC LIMIT 1";
    }
    return this.exec(sql, data).then(results => {
      const values = [];
      for (let i = 0; i < results.length; i++) {
        const val = [];
        for (let key in results[i]) {
          if (results[i].hasOwnProperty(key)) {
            val.push(results[i][key]);
          }
        }
        values.push(val);
      }
      const propertyWithValues = new Property(property);
      propertyWithValues.addValues(values);
      return Promise.resolve(propertyWithValues);
    });
  }

  /**
   * @param propertyId
   * @return {Promise<Object>}
   */
  getPropertyIndexAndDimensionCount(propertyId) {
    const dim = this.propertyIndexMap[propertyId];
    if (dim !== undefined) {
      return Promise.resolve();
    }
    const sqlId =
      "SELECT p.`index_id`, COUNT(*) AS 'num_dimensions' \n" +
      "FROM `properties` p \n" +
      "  JOIN `dimensions` d ON p.`index_id`=d.`property_index_id` \n" +
      "WHERE p.`id` = ? ";
    return this.exec(sqlId, [propertyId]).then(result => {
      if (result.length !== 1) {
        return Promise.reject("Not Found");
      }
      this.propertyIndexMap[propertyId] = {
        index: result[0].index_id,
        num_dimensions: result[0].num_dimensions
      };
      return this.propertyIndexMap[propertyId];
    });
  }

  createRole(subjectId, actorId, role) {
    const sql = "INSERT INTO `entities_roles` SET ?";
    const insert = {
      subject_entity_id: subjectId,
      actor_entity_id: actorId,
      role: role
    };
    return this.exec(sql, [insert]);
  }

  /**
   * @param {string} propertyType
   * @return {Promise<number>}
   */
  countPropertyByType(propertyType) {
    const sql = "SELECT COUNT(*) AS 'num_property' \n" +
    "FROM `properties` p \n" +
    "WHERE p.`type` = ? "
    return this.exec(sql, [propertyType]).then(result => {
      console.log('countPropertyByType',result)
      return result
    });
  }
  

}

module.exports = MySQL;
