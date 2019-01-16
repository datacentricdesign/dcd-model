'use strict';

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[lib:mysql]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const mysql = require('mysql');
const Person = require('../entities/Person');
const Thing = require('../entities/Thing');
const Property = require('../entities/Property');
const Dimension = require('../entities/Dimension');

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
                        if (error.code === 'ER_DUP_ENTRY') {
                            reject({error: 400, message: 'Already exists'});
                        } else {
                            reject({error: 500, message: 'Server Error'});
                            logger.error(error + '\n' + q.sql, this.name);
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
        const sql = 'INSERT INTO `things` SET ?';
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
        const sql = 'UPDATE `things` SET ? \n'
            + ' WHERE `id` = ? ';
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
            const sqlId = 'SELECT p.`index_id`,' +
                ' COUNT(*) AS \'num_dimensions\' \n' +
                'FROM `properties` p \n' +
                '  JOIN `dimensions` d' +
                '    ON p.`index_id`=d.`property_index_id` \n' +
                'WHERE p.`id` = ? \n' +
                'GROUP BY p.`index_id`';
            return this.exec(sqlId, [property.id])
                .then((result) => {
                    if (result.length !== 1) {
                        return Promise.reject('Not Found');
                    }
                    this.propertyIndexMap[property.id] = {
                        index: result[0].index_id,
                        num_dimensions: result[0].num_dimensions
                    };
                    return this.updatePropertyValues(property);
                });
        }

        let sql = 'INSERT IGNORE INTO `d' + dimensions.num_dimensions
            + '` (`property_index_id`, `timestamp`';
        for (let index = 1; index <= dimensions.num_dimensions; index++) {
            sql += ',`value' + index + '`';
        }
        sql += ') VALUES ?';
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
        const sql = 'INSERT INTO `properties` SET ?';
        const insert = {
            id: property.id,
            name: property.name,
            description: property.description,
            type: property.type,
            entity_id: property.entityId
        };
        return this.exec(sql, [insert])
            .then((result) => {
                if (property.dimensions === undefined
                    || property.dimensions.length === 0) {
                    return Promise.resolve(toPropertyID(property.name));
                }
                return this.insertDimensions(
                    result.insertId, property.dimensions);
            }).then(() => {
                return Promise.resolve(toPropertyID(property.name));
            });
    }

    /**
     * @param {Property} property
     * @return {Promise}
     */
    updateProperty(property) {
        const sql = 'UPDATE `properties` SET ? \n'
            + ' WHERE `id` = ? ';
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
        const sql = 'INSERT INTO `persons` SET ?';
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
        const sql = 'UPDATE `persons` SET ? \n'
            + ' WHERE `id` = ? ';
        return this.exec(sql, [update, person.id]);
    }

    /**
     * @param propertyIndexId
     * @param {Dimension[]} dimensions
     * @return {Promise}
     */
    insertDimensions(propertyIndexId, dimensions) {
        const sql = 'INSERT IGNORE INTO `dimensions`'
            + ' (`name`, `description`, `unit`, `property_index_id`) VALUES ?';
        const data = [];
        for (let index = 0; index < dimensions.length; index++) {
            const dim = dimensions[index];
            data.push([dim.name, dim.description, dim.unit, propertyIndexId]);
        }
        return this.exec(sql, [data]);
    }

    /**
     * @param {String} id
     * @return {*}
     */
    deletePerson(id) {
        const sql = 'DELETE FROM `persons` WHERE `id` = ?';
        return this.exec(sql, [id]);
    }

    /**
     * @param {String} id
     * @return {Promise}
     */
    deleteThing(id) {
        const sql = 'DELETE FROM `things` WHERE `id` = ?';
        return this.exec(sql, [id]);
    }

    /**
     * @param propertyId
     * @return {Promise}
     */
    deleteProperty(propertyId) {
        const sql = 'DELETE FROM `properties` WHERE `id` = ?';
        return this.exec(sql, [propertyId]);
    }


    /**
     * @param {String} entityId
     * @return {Promise<Property[]>}
     */
    listProperties(entityId) {
        const sql = 'SELECT p.`name` AS \'pname\',' +
            ' p.`description` AS \'pdesc\',' +
            ' p.`type` AS \'ptype\', p.`registered_at`,' +
            ' p.`id` AS \'property_id\', d.`name`,' +
            ' d.`description`, d.`unit`\n' +
            ' FROM `properties` p \n' +
            '  JOIN `dimensions` d ON d.`property_index_id` = p.`index_id` \n' +
            ' WHERE p.`entity_id` = ? ';
        return this.exec(sql, [entityId]).then((results) => {
            const properties = {};
            results.forEach( (data) => {
                const pId = data.property_id;
                const dimension = new Dimension(data.name,
                    data.description, data.unit);
                if (properties[pId] === undefined) {
                    properties[pId] = new Property(data.pname,
                        data.pdesc, data.ptype, [dimension], pId);
                    properties[pId].registeredAt = data.registered_at.getTime();
                } else {
                    properties[pId].addDimension(dimension);
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
        const sql = 'SELECT `id`, `name`  \n' +
            'FROM `persons` t\n' +
            '   JOIN `entities_roles` er ON t.`id`=er.`subject_entity_id`\n' +
            'WHERE er.`actor_entity_id` = ?';
        return this.exec(sql, [actorEntityId])
            .then( (result) => {
                const persons = [];
                result.forEach( (p) => {
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
        const sql = 'SELECT `id`, `name`, `description`, `type` \n' +
            'FROM `things` t\n' +
            '   JOIN `entities_roles` er ON t.`id`=er.`subject_entity_id`\n' +
            'WHERE er.`actor_entity_id` = ?';
        return this.exec(sql, actorEntityId).then((result) => {
            const things = [];
            result.forEach((data) => {
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
        let sql = 'SELECT id, name FROM `persons`\n' +
            ' WHERE `id` = ? ';
        const data = [personId];
        return this.exec(sql, data).then((result) => {
            if (result.length === 1) {
                return Promise.resolve(new Person(result[0]));
            } else {
                return Promise.reject({code: 404, message: 'Not Found'});
            }
        });
    }

    /**
     * @param {String} personId
     * @param {String} password
     * @return {Promise<Person>}
     */
    checkCredentials(personId, password) {
        let sql = 'SELECT id, name FROM `persons`\n' +
            'WHERE `id` = ? AND `password` = ? ';
        const data = [personId, password];
        return this.exec(sql, data).then((result) => {
            if (result.length === 1) {
                return Promise.resolve({valid: true});
            } else {
                return Promise.resolve({valid: false});
            }
        });
    }

    /**
     * @param {String} thingId
     * @returns {Promise<Thing>}
     */
    readThing(thingId) {
        const sql = 'SELECT * FROM `things`\n' +
            'WHERE `id` = ?';
        return this.exec(sql, thingId).then((result) => {
            if (result.length === 1) {
                return Promise.resolve(result[0]);
            } else {
                return Promise.reject({code: 404, message: 'Not Found'});
            }
        });
    }

    /**
     * @param {String} propertyId
     * @return {Promise<Property>}
     */
    readProperty(propertyId) {
        const sql = 'SELECT p.`name` AS \'pname\',' +
            ' p.`description` AS \'pdesc\',' +
            ' p.`type` AS \'ptype\', p.`registered_at`, p.`id`,' +
            ' d.`name`, d.`description`, d.`unit`\n' +
            'FROM `properties` p JOIN `dimensions` d' +
            ' ON p.`index_id` = d.`property_index_id`\n' +
            'WHERE p.`id` = ?';
        return this.exec(sql, [propertyId]).then((results) => {
            if (results.length > 0) {
                const data = results[0];
                const property = new Property(data.pname, data.pdesc,
                    data.ptype, [], data.id);
                property.registeredAt = data.registered_at.getTime();
                for (let index = 0; index < results.length; index++) {
                    property.addDimension(
                        new Dimension(data.name, data.description, data.unit));
                }
                return Promise.resolve(property);
            } else {
                return Promise.reject({code: 404, message: 'Not Found'});
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
        let sql = 'SELECT `timestamp`';
        let data = [];
        for (let i = 1; i <= property.dimensions.length; i++) {
            sql += ',`value' + i + '`';
        }
        sql += 'FROM `d' + property.dimensions.length + '` ';
        if (from !== undefined && to !== undefined) {
            sql += 'WHERE `timestamp` BETWEEN ? AND ? ORDER BY `timestamp`';
            data.push(from);
            data.push(to);
        } else if (from !== undefined) {
            sql += 'WHERE `timestamp` >= ? ORDER BY `timestamp`';
            data.push(from);
        } else if (to !== undefined) {
            sql += 'WHERE `timestamp` <= ? ORDER BY `timestamp`';
            data.push(to);
        } else {
            sql += 'ORDER BY `timestamp` DESC LIMIT 1';
        }
        return this.exec(sql, data).then((results) => {
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
     * @return {Promise<Object>}
     */
    listStates() {
        const sql = 'SELECT * FROM `states`';
        return this.exec(sql);
    }

    /**
     * @param propertyId
     * @return {Promise<Object>}
     */
    getPropertyIndexAndDimensionCount(propertyId) {
        const dim = this.propertyIndexMap[propertyId];
        if (dim !== undefined) {
            Promise.resolve();
        }
        const sqlId = 'SELECT p.`index_id`, COUNT(*) AS \'num_dimensions\' \n' +
            'FROM `properties` p \n' +
            '  JOIN `dimensions` d ON p.`index_id`=d.`property_index_id` \n' +
            'WHERE p.`id` = ? ';
        return this.exec(sqlId, [propertyId])
            .then((result) => {
                if (result.length !== 1) {
                    return Promise.reject('Not Found');
                }
                this.propertyIndexMap[propertyId] = {
                    index: result[0].index_id,
                    num_dimensions: result[0].num_dimensions
                };
                return this.propertyIndexMap[propertyId];
            });
    }

    createRole(subjectId, actorId, role) {
        const sql = 'INSERT INTO `entities_roles` SET ?';
        const insert = {
            subject_entity_id: subjectId,
            actor_entity_id: actorId,
            role: role
        };
        return this.exec(sql, [insert]);
    }
}

module.exports = MySQL;

function toPropertyID(name) {
    return name.split(' ').join('-').toLowerCase();
}