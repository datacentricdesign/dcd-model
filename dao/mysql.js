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
const Task = require("../entities/Task")
const Resource = require("../entities/Resource")

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
   *
   * @returns {Promise<number>}
   */
  countPersons() {
    const sql = "SELECT COUNT(`id`) AS 'num_persons' \n" +
    "FROM `persons` p \n" 
    return this.exec(sql).then(result => {
      console.log('countPersons',result)
      return result[0].num_persons
    });
  }

  /**
   *
   * @returns {Promise<number>}
   */
  countThings() {
    const sql = "SELECT COUNT(`id`) AS 'num_things' \n" +
    "FROM `things` p \n" 
    return this.exec(sql).then(result => {
      console.log('countThings',result)
      return result[0].num_things
    });
  }

  /**
   *
   * @returns {Promise<number>}
   */
  countProperties() {
    const sql = "SELECT COUNT(`id`) AS 'num_properties' \n" +
    "FROM `properties` p \n" 
    return this.exec(sql).then(result => {
      console.log('countProperties',result)
      return result[0].num_properties
    });
  }
  /**
   * @returns {Promise<Object>}
   */
  getGlobalStats(){
    return this.countPersons()
    .then(num_persons => {
      return this.countThings()
      .then(num_things => {
        return this.countProperties()
        .then(num_properties => {
          let json = {
            persons : num_persons,
            things : num_things,
            properties : num_properties
          }
          var types = Object.keys(Property.types())
          return this.getGlobalTypesStats(types,json).then(result =>{
            //console.log('getGlobalTypesStats',result)
            return Promise.resolve(result)
          })
        })
      })
    })
  }

  /**
   * 
   * @param {String[]} types
   * @returns {Promise<Object>} 
   */
  getGlobalTypesStats(types,json){
    if(types.length == 0){
      return Promise.resolve(json)
    }else{
      let propertyType = types[0]
      if(Property.types()[propertyType] === undefined) {
        return Promise.reject(propertyType + " doesn't exist")
      }else{
        return this.countEntitiesByType(propertyType)
        .then(total_entities =>{
        return this.countPropertiesByType(propertyType)
        .then(total_properties =>{
        return this.countValuesByType(propertyType)
        .then(total_values => {
          json[propertyType] = {
            entities : total_entities,
            properties : total_properties,
            values : total_values
          }
          types.shift()
          return this.getGlobalTypesStats(types,json)
        })
        })
        })
      }
    }
  }

  /**
   * @param {string} propertyType
   * @returns {Promise<number>}
   */
  countEntitiesByType(propertyType) {
    if(Property.types()[propertyType] === undefined) {
      return Promise.reject(propertyType + " doesn't exist")
    }else{
    const sql = "SELECT COUNT( DISTINCT `entity_id`) AS 'num_entities' \n" +
    "FROM `properties` p \n" +
    "WHERE p.`type` = ? "
    return this.exec(sql, [propertyType]).then(result => {
      //console.log('countEntityByType',propertyType,result)
      return result[0].num_entities
    });
  }
  }

  /**
   * @param {string} propertyType
   * @returns {Promise<number>}
   */
  countPropertiesByType(propertyType) {
    if(Property.types()[propertyType] === undefined) {
      return Promise.reject(propertyType + " doesn't exist")
    }else{
    const sql = "SELECT COUNT( DISTINCT `id`) AS 'num_properties' \n" +
    "FROM `properties` p \n" +
    "WHERE p.`type` = ? "
    return this.exec(sql, [propertyType]).then(result => {
      //console.log('countPropertiesByType',propertyType,result)
      return result[0].num_properties
    });
  }
  }

  /**
   * 
   * @param {string} propertyType 
   * @returns {Promise<number>}
   */
  countValuesByType(propertyType){
    if(Property.types()[propertyType] === undefined) {
      return Promise.reject(propertyType + " doesn't exist")
    }else{
    const n = Property.types()[propertyType].dimensions.length
    let sql = "SELECT COUNT(`timestamp`) AS 'num_values' \n";
    sql += "FROM `d" + n + "` ";
    sql +=
      " JOIN properties `p` ON p.`index_id` = `d" +
      n +
      "`.`property_index_id`";
    sql += " WHERE `p`.type = ?";
    return this.exec(sql, [propertyType]).then(result => {
      //console.log('countValuesByType',result)
      return result[0].num_values
    });
  }
  }

  /**
   * @param {string} propertyType
   * @returns {Promise<number>}
   */
  countEntitiesInRangeByType(propertyType,from,to) {
    if(Property.types()[propertyType] === undefined) {
      return Promise.reject(propertyType + " doesn't exist")
    }else{
    const n = Property.types()[propertyType].dimensions.length
    let sql = "SELECT COUNT( DISTINCT `entity_id`) AS 'num_entities' \n"
    let data = [];
    sql +="FROM `properties` p"
    sql +=" LEFT JOIN d"+ n +" d ON d.`property_index_id` = `p`.`index_id`"
    sql += " WHERE p.`type` = ? "
    data.push(propertyType);
    if (from !== undefined && to !== undefined) {
      sql += "AND d.`timestamp` BETWEEN ? AND ? ORDER BY d.`timestamp`";
      data.push(from);
      data.push(to);
    } else if (from !== undefined) {
      sql += "AND d.`timestamp` >= ? ORDER BY d.`timestamp`";
      data.push(from);
    } else if (to !== undefined) {
      sql += "AND d.`timestamp` <= ? ORDER BY d.`timestamp`";
      data.push(to);
    } else {
      sql += "ORDER BY d.`timestamp` DESC LIMIT 1";
    }
    return this.exec(sql, data).then(result => {
      //console.log('countEntityInRangeByType',propertyType,result)
      return result[0].num_entities
    });
  }
  }

  /**
   * @param {string} propertyType
   * @param {int} from
   * @param {int} to
   * @returns {Promise<number>}
   */
  countPropertiesInRangeByType(propertyType,from,to){
    if(Property.types()[propertyType] === undefined) {
      return Promise.reject(propertyType + " doesn't exist")
    }else{
      const n = Property.types()[propertyType].dimensions.length
      let sql = "SELECT COUNT( DISTINCT `id`) AS 'num_properties' \n"
      let data = [];
      sql +="FROM `properties` p"
      sql +=" LEFT JOIN d"+ n +" d ON d.`property_index_id` = `p`.`index_id`"
      sql += " WHERE p.`type` = ? "
      data.push(propertyType);
      if (from !== undefined && to !== undefined) {
        sql += "AND d.`timestamp` BETWEEN ? AND ? ORDER BY d.`timestamp`";
        data.push(from);
        data.push(to);
      } else if (from !== undefined) {
        sql += "AND d.`timestamp` >= ? ORDER BY d.`timestamp`";
        data.push(from);
      } else if (to !== undefined) {
        sql += "AND d.`timestamp` <= ? ORDER BY d.`timestamp`";
        data.push(to);
      } else {
        sql += "ORDER BY d.`timestamp` DESC LIMIT 1";
      }
      return this.exec(sql, data).then(result => {
        //console.log('countEntityInRangeByType',propertyType,result)
        return result[0].num_properties
      });
    }
  }

  /**
   * @param {string} propertyType
   * @param {int} from
   * @param {int} to
   * @returns {Promise<number>}
   */
  countValuesInRangeByType(propertyType,from,to){
    if(Property.types()[propertyType] === undefined) {
      return Promise.reject(propertyType + " doesn't exist")
    }else{
    const n = Property.types()[propertyType].dimensions.length
    let sql = "SELECT COUNT(`timestamp`) AS 'num_values' \n";
    let data = [];
    sql += "FROM `d" + n + "` ";
    sql +=
      " JOIN properties `p` ON p.`index_id` = `d" +
      n +
      "`.`property_index_id`";
    sql += " WHERE `p`.type = ?";
    data.push(propertyType);
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
    return this.exec(sql, data).then(result => {
      //console.log('countValuesByType',result)
      return result[0].num_values
    });
  }
  }

  /**
   * 
   * @param {string[]} types 
   * @param {int} from 
   * @param {int} to 
   * @returns {Promise<Object>}
   */
  getTypesStats(types,from,to){
    let json = 
      {
        types : [],
        total_properties : 0,
        total_entities : 0,
        total_values : 0,
        range : {
            from : from,
            to : to,
            properties : 0,
            entities : 0,
            values : 0,
              }
        }
    return this.fillTypesStatsJson(types,from,to,json).then(result =>{
      //console.log('fillTypesStatsJson',result)
      return Promise.resolve(result)
    })
  }

  /**
   * 
   * @param {string[]} types 
   * @param {int} from 
   * @param {int} to 
   * @param {object} json 
   * @returns {Promise<Object>}
   */
  fillTypesStatsJson(types,from,to,json){
    if(types.length == 0){
      return Promise.resolve(json)
    }else{
      let propertyType = types[0]
      if(Property.types()[propertyType] === undefined) {
        return Promise.reject(propertyType + " doesn't exist")
      }else{
        return this.countEntitiesByType(propertyType)
        .then(total_entities =>{
        return this.countPropertiesByType(propertyType)
        .then(total_properties =>{
        return this.countValuesByType(propertyType)
        .then(total_values => {
        return this.countEntitiesInRangeByType(propertyType,from,to)
        .then(num_entities => {
        return this.countPropertiesInRangeByType(propertyType,from,to)
        .then(num_properties => {
        return this.countValuesInRangeByType(propertyType,from,to)
        .then(num_values =>{
          
          json.total_entities += total_entities
          json.total_properties += total_properties
          json.total_values += total_values
          json.range.entities+= num_entities
          json.range.properties += num_properties
          json.range.values += num_values
          json.types.push(types.shift())
          return this.fillTypesStatsJson(types,from,to,json)

      })
      })
      })
      })
      })
      })
      }
    }
  }

  /**
   *
   * @param {Task} task
   * @returns {Promise}
   */
  createTask(task) {
    const insert = {
      id: task.id,
      name: task.name,
      types: task.types.join(),
      description: task.description,
      from : task.from,
      to : task.to,
      actor_entity_id : task.actorEntityId
    };
    const sql = "INSERT INTO `tasks` SET ?";
    return this.exec(sql, [insert]);
  }

  /**
   * @param {Task} task 
   */
  createResources(task){
    let t = JSON.parse(JSON.stringify(task))
    return this.getArrayResources(t)
    .then(resources => {
      return this.insertResources(resources)
      .then(num_resources_created =>{
        console.log(num_resources_created + " resources created")
        return Promise.resolve(num_resources_created)
      })
    })
  }

  /**
   * @param {Task} task 
   * @returns {Promise<Resource[]>} Array of resources of a task in the DB
   */
  getArrayResources(task,empty_json = {}){
    if(task.types.length == 0){
      let person_ids = Object.keys(empty_json) 
      let resources = []
      let now  = Date.now()
      person_ids.forEach(person_id => {

        let milestones = [
          {
            timestamp : Date.now(),
            shared_properties : empty_json[person_id].join(),
            status : "unread"
          }
        ]

        resources.push(new Resource(
          task.id,
          person_id,
          milestones
          ))
      })
      return Promise.resolve(resources);
    }else{
      let propertyType = task.types[0]
      let from = task.from
      let to = task.to
      if(Property.types()[propertyType] === undefined) {
        return Promise.reject(propertyType + " doesn't exist")
      }else{
        return this.findPropertiesInRangeByType(propertyType,from,to)
        .then(array =>{
          return this.remplaceEntityByOwner(array,empty_json)
          .then(json => {
            task.types.shift()
            return this.getArrayResources(task,json)
          })
        })
      }
    }
  }

  /**
   * @param {String} propertyType 
   * @param {int} from 
   * @param {int} to
   * @returns {Array} array of object with property id and entity_id 
   */
  findPropertiesInRangeByType(propertyType,from,to){
      if(Property.types()[propertyType] === undefined) {
        return Promise.reject(propertyType + " doesn't exist")
      }else{
        const n = Property.types()[propertyType].dimensions.length
        let sql = "SELECT `id`, `entity_id` FROM `properties` p \n"
        sql +=" LEFT JOIN d"+ n +" d ON d.`property_index_id` = `p`.`index_id`"
        sql += " WHERE p.`type` = ? "
        let data = [];
        data.push(propertyType);
        if (from !== undefined && to !== undefined) {
          sql += "AND d.`timestamp` BETWEEN ? AND ? ORDER BY d.`timestamp`";
          data.push(from);
          data.push(to);
        } else if (from !== undefined) {
          sql += "AND d.`timestamp` >= ? ORDER BY d.`timestamp`";
          data.push(from);
        } else if (to !== undefined) {
          sql += "AND d.`timestamp` <= ? ORDER BY d.`timestamp`";
          data.push(to);
        } else {
          sql += "ORDER BY d.`timestamp` DESC LIMIT 1";
        }
        return this.exec(sql, data).then(result => {
          let array =[]
          result.forEach(r => {
            if (!(array.some(e => e.id === r.id))) {
              /* array not contains the element we're looking for */
              array.push(r)
            }
          })
          return array
        });
      }
  }

  /**
   * @param {String[][]} array Array of object property id and entity
   * @param {Object} json 
   * @returns {Object} A json with persons id in keys and array of property id in values
   */
  remplaceEntityByOwner(array,json){
    if(array.length == 0){
      return Promise.resolve(json)
    }
    else{
      let propertyId = array[0].id
      let entityId = array[0].entity_id
      return this.findOwner(entityId)
      .then(personId=>{
        if(json.hasOwnProperty(personId)){
          json[personId].push(propertyId)
        }else{
          json[personId] = [propertyId]
        }
        array.shift()
        return this.remplaceEntityByOwner(array,json)
      })
    }
  }

  /**
   * @param {String} entityId 
   * @returns {String} personId (owner of the entityId)
   */
  findOwner(entityId){
    let sql = "SELECT actor_entity_id FROM `entities_roles`\n" + " WHERE `subject_entity_id` = ? ";
    const data = [entityId];
    return this.exec(sql, data).then(result => {
      if (result.length === 1) {
        return Promise.resolve(result[0].actor_entity_id);
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {Resource[]} resources 
   */
  insertResources(resources,size = 0){
    if(resources.length == 0){
      return Promise.resolve(size)
    }else{
      size ++
      let resource = resources[0]
      return this.createResource(resource)
      .then(()=>{
        resources.shift()
        return this.insertResources(resources,size)
      })
    }
  }

  /**
   * @param {Resource} resource 
   */
  createResource(resource){
    const insert_resource = {
      id: resource.id,
      task_id: resource.taskId,
      subject_entity_id : resource.subjectEntityId
    };
    const sql = "INSERT INTO `resources` SET ?";
    return this.exec(sql, [insert_resource])
    .then(() => {
      const sql = "INSERT INTO `milestones` SET ?"
      const first_milestone = resource.milestones[0]

      const insert_milestone = {
        resource_id :resource.id,
        timestamp : first_milestone.timestamp,
        shared_properties : first_milestone.shared_properties,
        status : first_milestone.status
      }
      return this.exec(sql,[insert_milestone])
    })
  }
  
  /**
   * 
   * @param {String} personId 
   * @returns {Promise<Object>}
   */
  listTasks(personId){
    return this.listActorTasks(personId)
    .then(actor_tasks=>{
      //console.log(actor_tasks)
      return this.listSubjectTasks(personId)
      .then(subject_tasks => {
        //console.log(subject_tasks)
        return Promise.resolve({
          actor_tasks : actor_tasks,
          subject_tasks : subject_tasks
        })
      })
    })
  }

  /**
   * @param actorEntityId
   * @returns {Promise<Tasks[]>}
   */
  listActorTasks(actorEntityId) {
    const sql =
      "SELECT * FROM `tasks` \n" +
      "  WHERE `actor_entity_id` = ?";
    return this.exec(sql, actorEntityId).then(result => {
      const tasks = [];
      result.forEach(data => {
        tasks.push(new Task(data));
      });
      return tasks
    });
  }

    /**
   * @param subjectEntityId
   * @returns {Promise<Tasks[]>}
   */
  listSubjectTasks(subjectEntityId) {
    const sql =
    "SELECT t.`id`, t.`name`, t.`description`, t.`types`, t.`from`, t.`to`, t.`actor_entity_id`, t.`registered_at`  FROM `tasks` t\n" +
      "   JOIN `resources` r ON t.`id`=r.`task_id`\n" +
      "WHERE r.`subject_entity_id` = ?";
    return this.exec(sql, [subjectEntityId]).then(result => {
      const tasks = [];
      result.forEach(data => {
        tasks.push(new Task(data));
      });
      return tasks
    });
  }

  /**
   * @param {String} taskId
   * @returns {Promise<Task>}
   */
  readTask(taskId) {
    const sql = "SELECT * FROM `tasks`\n" + "WHERE `id` = ?";
    return this.exec(sql, taskId).then(result => {
      if (result.length === 1) {
        return Promise.resolve(new Task(result[0]));
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {String} taskId
   * @returns {Promise}
   */
  deleteTask(taskId,actorEntityId) {
    //From now we check if the actor_entity_id match for delete => not the good way ? => keto
    const sql = "DELETE FROM `tasks` WHERE `id` = ? AND `actor_entity_id` = ?";
    return this.exec(sql, [taskId,actorEntityId])
    //Then delete ressource Then delete milestones ?
  }

  /**
   * 
   * @param {String} taskId 
   * @param {String} actorEntityId 
   * @returns {Promise<Resource[]>}
   */
  readActorResources(taskId,actorEntityId){
    const sql =
      "SELECT r.`id`, r.`task_id`  FROM `resources` r\n" +
      "   JOIN `tasks` t ON r.`task_id`= t.`id`\n" +
      "WHERE t.`id` = ? AND t.`actor_entity_id` = ? ";
    const data = [taskId, actorEntityId];
    return this.exec(sql, data).then(result => {
      return this.RecupMilestones(result)
    });
  }

  /**
   * 
   * @param {String} taskId 
   * @param {String} subjectEntityId 
   * @returns {Promise<Resource[]>}
   */
  readSubjectResources(taskId,subjectEntityId){
    const sql =
      "SELECT `id`, `task_id`  \n" +
      "FROM `resources` \n" +
      "WHERE `task_id` = ? AND `subject_entity_id` = ? ";
    const data = [taskId, subjectEntityId];
    return this.exec(sql, data).then(result => {
      return this.RecupMilestones(result)
    });
  }

  /**
   * @param {Array} data array of object from the resources table
   * @param {Array} resources empty array
   * @returns {Promise<Resource[]>} ressources with milestones
   */
  RecupMilestones(data,resources = []){
    if(data.length == 0){
      return Promise.resolve(resources)
    }else{
      let resourceId = data[0].id
      let taskId = data[0].task_id
      return this.readMilestones(resourceId)
      .then(result =>{
        resources.push(new Resource(
          taskId,
          undefined,
          result,
          resourceId
        ))
          data.shift()
        return this.RecupMilestones(data,resources)
      })
    }
  }

  /**
   * @param {String} resourceId 
   * @returns {Array} array of object from table milestones
   */
  readMilestones(resourceId){
    const sql = "SELECT `timestamp`, `shared_properties`,`status` FROM `milestones`\n" + 
    "WHERE `resource_id` = ? ORDER BY `timestamp`";
    return this.exec(sql, resourceId).then(result => {
      if (result.length > 0) {
        return Promise.resolve(result);
      } else {
        return Promise.reject({ code: 404, message: "Not Found" });
      }
    });
  }

  /**
   * @param {String} resourceId 
   * @param {String} subjectEntityId
   * @returns {Boolean} the subject is th owner 
   */
  checkSubject(resourceId,subjectEntityId){
    let sql = "SELECT * FROM `resources`\n" + " WHERE `id` = ? AND `subject_entity_id` = ? ";
    const data = [resourceId,subjectEntityId];
    return this.exec(sql, data).then(result => {
      if (result.length === 1) {
        return Promise.resolve(true);
      } else {
        return Promise.reject({ code: 403, message: "Forbidden, your are not the owner of the resource" });
      }
    });
  }

  /**
   * @param {Object} milestone 
   */
  addMilestone(milestone){
    const sql = "INSERT INTO `milestones` SET ?"
      return this.exec(sql,[milestone])
  }


}

module.exports = MySQL;