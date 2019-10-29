'use strict';

import mysql = require('mysql');

import { Report } from '../services/PropertyService';
import { Person } from '../entities/Person';
import { Thing } from '../entities/Thing';
import { Interaction } from '../entities/Interaction';
import {JSONProperty, Property} from '../entities/Property';
import { Dimension } from '../entities/Dimension';
import { Class } from '../entities/Class';
import { DCDError } from '../lib/Error';
import log4js = require('log4js');
import {JSONCheck} from "../services/PersonService";
import {CreationReport, DeletionReport} from "../services/Service";

const logger = log4js.getLogger('[lib:mysql]');
logger.level = process.env.LOG_LEVEL || 'INFO';

export class MySQL {
    pool: mysql.Pool;
    /**
     *
     */
    constructor() {
        this.pool = null;
    }

    /**
     * Connect to MySQL server
     **/
    connect(host, user, pass, name): void {
        const dbConfig = {
            connectionLimit: 100,
            host: host,
            user: user,
            password: pass,
            database: name,
            multipleStatements: true,
            debug: false,
            insecureAuth: true,
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
    exec(sql, data = null): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((error, connection) => {
                if (error) {
                    return reject(error);
                } else if (connection === undefined) {
                    return reject(new DCDError(500, 'MySQL connection undefined.'));
                }
                const q = connection.query(sql, data, (error, result) => {
                    connection.release();
                    if (error !== null) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            return reject(new DCDError(4006, 'Already exists'));
                        } else {
                            logger.error(q.sql);
                            return reject(new DCDError(500, error.message));
                        }
                    } else {
                        return resolve(result);
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
            type: thing.type,
        };
        const sql = 'INSERT INTO `things` SET ?';
        return this.exec(sql, [insert]);
    }

    /**
     *
     * @param {Thing} thing
     * @return {Promise}
     */
    updateThing(thing): Promise<void> {
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
        const sql = 'UPDATE `things` SET ? \n' + ' WHERE `id` = ? ';
        return this.exec(sql, [update, thing.id]);
    }

    /**
     * @param {Property} property
     * @return {Promise}
     */
    updatePropertyValues(property): Promise<Report> {
        if (property.values === undefined || property.values.length === 0) {
            // there is no value to update
            return Promise.resolve({
                received: 0,
                stored: 0,
                duplicates: 0,
                malformed: 0,
                timestampAdded: 0,
            });
        }
        const values = property.values;
        const nbDimensions = property.dimensions.length;

        let sql = 'INSERT IGNORE INTO `d';
        sql += property.dimensions[0].type === 'TEXT' ? 'text' : nbDimensions;
        sql += '` (`property_index_id`, `timestamp`';
        for (let index = 1; index <= nbDimensions; index++) {
            sql += ',`value' + index + '`';
        }
        sql += ') VALUES ?';
        const data = [];
        let count = 0;
        let countAddedTimestamp = 0;
        let countIgnoredValues = 0;
        for (let i = 0; i < values.length; i++) {
            const row = [property.indexId];
            count++;
            if (values[i].length === nbDimensions) {
                // Missing timestamp, adding time
                values[i].unshift(+new Date());
                countAddedTimestamp++;
            } else if (values[i].length < nbDimensions || values[i].length > nbDimensions + 1) {
                // Wrong number of dimension
                countIgnoredValues++;
                continue;
            }
            data.push(row.concat(values[i]));
        }
        return this.exec(sql, [data]).then(result => {
            return Promise.resolve({
                received: count,
                stored: result.affectedRows,
                duplicates: count - countIgnoredValues - result.affectedRows,
                malformed: countIgnoredValues,
                timestampAdded: countAddedTimestamp,
            });
        });
    }

    /**
     * @param {Property} property
     * @return {Promise}
     */
    createProperty(property) {
        const sql = 'INSERT INTO `properties` SET ?';
        const insert: JSONProperty = {
            id: property.id,
            name: property.name,
            description: property.description,
            type: property.type,
            entity_id: property.entityId,
        };
        return this.exec(sql, [insert])
            .then(result => {
                if (property.dimensions === undefined || property.dimensions.length === 0) {
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
        const update: JSONProperty = {};
        let toUpdate = false;
        if (property.name !== undefined && property.name !== '') {
            update.name = property.name;
            toUpdate = true;
        }
        if (property.description !== undefined && property.description !== '') {
            update.description = property.description;
            toUpdate = true;
        }
        if (toUpdate) {
            const sql = 'UPDATE `properties` SET ? WHERE `id` = ? ';
            return this.exec(sql, [update, property.id]);
        }
        return Promise.resolve();
    }

    /**
     * @param {Person} person
     * @return {Promise}
     */
    createPerson(person) {
        const insert = {
            id: person.id,
            name: person.name,
            password: person.password,
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
        const sql = 'UPDATE `persons` SET ? \n' + ' WHERE `id` = ? ';
        return this.exec(sql, [update, person.id]);
    }

    /**
     * @param propertyIndexId
     * @param {Dimension[]} dimensions
     * @return {Promise}
     */
    insertDimensions(propertyIndexId, dimensions) {
        const sql =
            'INSERT IGNORE INTO `dimensions`' + ' (`name`, `description`, `unit`, `property_index_id`) VALUES ?';
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
        const sql = 'INSERT IGNORE INTO `classes`' + ' (`name`, `description`, `value`, `property_id`) VALUES ?';
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
        const sql = 'SELECT `name`, `description`, `value`\n' + 'FROM `classes`\n' + +'WHERE `property_id` = ?';
        return this.exec(sql, [propertyId]).then(results => {
            const classes = [];
            results.forEach(data => {
                classes.push(new Class(data.name, data.value, propertyId, data.description));
            });
            return Promise.resolve(classes);
        });
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
        const sql =
            "SELECT p.`name` AS 'pname'," +
            " p.`description` AS 'pdesc', p.`type` AS 'ptype', " +
            " p.`registered_at`, p.`id` AS 'property_id', " +
            ' d.`name`, d.`description`, d.`unit`, ' +
            " c.`name` AS 'cname', c.`description` AS 'cdesc', c.`value` AS 'cvalue'\n" +
            ' FROM `properties` p \n' +
            '  JOIN `dimensions` d ON d.`property_index_id` = p.`index_id` \n' +
            '  LEFT JOIN `classes` c ON c.`property_id` = p.`id` \n' +
            ' WHERE p.`entity_id` = ? ' +
            ' ORDER BY `pname`, d.`name`';
        return this.exec(sql, [entityId]).then(results => {
            const properties = {};
            results.forEach(data => {
                const pId = data.property_id;

                // if we did not add this property yet
                if (properties[pId] === undefined) {
                    properties[pId] = new Property(data.pname, data.pdesc, data.ptype, [], [], pId);
                    properties[pId].registeredAt = data.registered_at.getTime();
                    properties[pId].entityId = entityId;
                }

                const dimensions = properties[pId].dimensions;
                // if we did not add this dimension yet (none or current different from previous)
                if (dimensions.length === 0 || dimensions[dimensions.length - 1].name !== data.name) {
                    const dimension = new Dimension(data.name, data.description, data.unit);
                    properties[pId].addDimension(dimension);
                }

                if (data.cname !== null) {
                    properties[pId].addClass(new Class(data.cname, data.cvalue, pId, data.cdesc));
                }
            });
            const propArray = [];
            for (const key in properties) {
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
            "SELECT p.`id` AS 'id', `name`  \n" +
            'FROM `persons` p\n' +
            '   JOIN `roles` r ON p.`id`=r.`subject_entity_id`\n' +
            'WHERE r.`actor_entity_id` = ?';
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
    listThings(actorEntityId: string): Promise<Thing[]> {
        const sql =
            "SELECT t.`id` AS 'id', `name`, `description`, `type` \n" +
            'FROM `things` t\n' +
            '   JOIN `roles` r ON t.`id`=r.`subject_entity_id`\n' +
            'WHERE r.`actor_entity_id` = ?';
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
        const sql = 'SELECT id, name FROM `persons`\n' + ' WHERE `id` = ? ';
        const data = [personId];
        return this.exec(sql, data).then(result => {
            if (result.length === 1) {
                return Promise.resolve(new Person(result[0]));
            } else {
                return Promise.reject(new DCDError(404, 'The Person with id ' + personId + ' could not be found.'));
            }
        });
    }

    /**
     * @param {String} personId
     * @param {String} password
     * @return {Promise<Person>}
     */
    checkCredentials(personId, password): Promise<JSONCheck> {
        const sql = 'SELECT id, name FROM `persons`\n' + 'WHERE `id` = ? AND `password` = ? ';
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
        const sql = 'SELECT * FROM `things`\n' + 'WHERE `id` = ?';
        return this.exec(sql, thingId).then(result => {
            if (result.length === 1) {
                return Promise.resolve(new Thing(result[0]));
            } else {
                return Promise.reject(new DCDError(404, 'The Thing with id ' + thingId + ' could not be found'));
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
            entity_id_2: interaction.entityId2,
        };
        const sql = 'INSERT INTO `interactions` SET ?';
        return this.exec(sql, [insert]);
    }

    /**
     * @param actorEntityId
     * @param entityId1
     * @param entityId2
     * @return {Promise<Interaction[]>}
     */
    listInteractions(actorEntityId, entityId1, entityId2?): Promise<Interaction[]> {
        let sql =
            "SELECT `interactions`.`id` AS 'id', `entity_id_1`, `entity_id_2` \n" +
            'FROM `interactions` i\n' +
            '   JOIN `roles` er\n' +
            '       ON (i.`entity_id_1`=er.`subject_entity_id` ' +
            '          OR i.`entity_id_2`=er.`subject_entity_id`)\n' +
            ' WHERE er.`actor_entity_id` = ?\n' +
            '   AND (i.`entity_id_1` = ? OR i.`entity_id_2` = ?)\n';
        const data = [actorEntityId, entityId1, entityId1];
        if (entityId2 !== undefined) {
            sql += +'    AND (i.`entity_id_1` = ? OR i.`entity_id_2` = ?)\n';
            data.push(entityId2, entityId2);
        }
        sql += ' GROUP BY `id`';
        return this.exec(sql, data).then(result => {
            const interactions = Interaction[];
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
        const sql = 'SELECT * FROM `interactions`\n' + 'WHERE `id` = ?';
        return this.exec(sql, interactionId).then(result => {
            if (result.length === 1) {
                return Promise.resolve(new Interaction(result[0]));
            } else {
                return Promise.reject(
                    new DCDError(404, 'The Interaction with id ' + interactionId + ' could not be found.'),
                );
            }
        });
    }

    /**
     * @param {String} entityId1
     * @param {String} entityId2
     * @returns {Promise<Interaction>}
     */
    readInteractionByEntityId(entityId1, entityId2): Promise<Interaction> {
        const sql =
            'SELECT * FROM `interactions`\n' +
            'WHERE (`entity_id_1` = ? AND `entity_id_2` = ?)\n' +
            ' OR (`entity_id_2` = ? AND `entity_id_1` = ?)';
        return this.exec(sql, [entityId1, entityId2, entityId1, entityId2]).then(result => {
            if (result.length === 1) {
                return Promise.resolve(new Interaction(result[0]));
            } else {
                return Promise.reject(
                    new DCDError(404, 'No interaction could be found between ' + entityId1 + ' and ' + entityId2 + '.'),
                );
            }
        });
    }

    /**
     * @param {String} id
     * @return {*}
     */
    deleteInteraction(id): Promise<DeletionReport> {
        const sql = 'DELETE FROM `interactions` WHERE `id` = ?';
        return this.exec(sql, [id]);
    }

    /**
     * @param {String} entityId
     * @param {String} propertyId
     * @return {Promise<Property>}
     */
    readProperty(entityId, propertyId): Promise<Property> {
        const sql =
            "SELECT p.`name` AS 'pname'," +
            " p.`description` AS 'pdesc'," +
            " p.`type` AS 'ptype', p.`registered_at`, p.`id`," +
            ' p.`index_id`, d.`name`, d.`description`, d.`unit`\n' +
            'FROM `properties` p JOIN `dimensions` d' +
            ' ON p.`index_id` = d.`property_index_id`\n' +
            'WHERE p.`entity_id` = ? AND  p.`id` = ?';
        return this.exec(sql, [entityId, propertyId]).then(results => {
            if (results.length > 0) {
                const data = results[0];
                const dimensions = [];
                for (let index = 0; index < results.length; index++) {
                    dimensions.push(new Dimension(data.name, data.description, data.unit));
                }
                const property = new Property(data.pname, data.pdesc, data.ptype, dimensions, [], data.id);
                property.registeredAt = data.registered_at.getTime();
                property.indexId = data.index_id;
                return Promise.resolve(property);
            } else {
                return Promise.reject(
                    new DCDError(
                        404,
                        'The Property with id ' + propertyId + ' (entity id ' + entityId + ') could not be found.',
                    ),
                );
            }
        });
    }

    /**
     * @param {Property} property
     * @param {int} from
     * @param {int} to
     * @return {Promise<Property>}
     */
    readPropertyValues(property, from, to): Promise<Property> {
        let sql = 'SELECT `timestamp`';
        const data = [];
        for (let i = 1; i <= property.dimensions.length; i++) {
            sql += ',`value' + i + '`';
        }
        let table = 'd' + property.dimensions.length;
        if (property.type === 'TEXT') table = 'dtext';
        sql +=
            ' FROM `' +
            table +
            '` \n' +
            ' JOIN properties `p` \n' +
            'ON p.`index_id` = `' +
            table +
            '`.`property_index_id`';
        sql += ' WHERE `p`.id = ?';
        data.push(property.id);
        if (from !== undefined && to !== undefined) {
            sql += 'AND `timestamp` BETWEEN ? AND ? ORDER BY `timestamp`';
            data.push(from);
            data.push(to);
        } else if (from !== undefined) {
            sql += 'AND `timestamp` >= ? ORDER BY `timestamp`';
            data.push(from);
        } else if (to !== undefined) {
            sql += 'AND `timestamp` <= ? ORDER BY `timestamp`';
            data.push(to);
        } else {
            sql += 'ORDER BY `timestamp` DESC LIMIT 1';
        }
        return this.exec(sql, data).then(results => {
            const values = [];
            for (let i = 0; i < results.length; i++) {
                const val = [];
                for (const key in results[i]) {
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

    createRole(actorId, subjectId, roleName): Promise<CreationReport> {
        const sql = 'INSERT IGNORE INTO `roles` SET ?';
        const insert = {
            actor_entity_id: actorId,
            subject_entity_id: subjectId,
            role: roleName,
        };
        return this.exec(sql, [insert]);
    }

    deleteRole(actorId, subjectId, roleName): Promise<DeletionReport> {
        const sql = 'DELETE FROM `roles` \n' + 'WHERE `actor_entity_id` = ? AND `subject_entity_id` = ? AND `role` = ?';
        return this.exec(sql, [actorId, subjectId, roleName]);
    }

    readRoleId(actorId, subjectId, roleName) {
        const sql =
            'SELECT `id`  FROM `roles` \n' + 'WHERE `actor_entity_id` = ? AND `subject_entity_id` = ? AND `role` = ?';
        return this.exec(sql, [actorId, subjectId, roleName]);
    }

    /**
     *
     * @return {Promise<number>}
     */
    countPersons(): Promise<number> {
        const sql = "SELECT COUNT(`id`) AS 'num_persons' \n" + 'FROM `persons` p \n';
        return this.exec(sql).then(result => {
            console.log('countPersons', result);
            return result[0].num_persons;
        });
    }

    /**
     *
     * @return {Promise<number>}
     */
    countThings(): Promise<number> {
        const sql = "SELECT COUNT(`id`) AS 'num_things' \n" + 'FROM `things` p \n';
        return this.exec(sql).then(result => {
            console.log('countThings', result);
            return result[0].num_things;
        });
    }

    /**
     *
     * @return {Promise<number>}
     */
    countProperties(): Promise<number> {
        const sql = "SELECT COUNT(`id`) AS 'num_properties' \n" + 'FROM `properties` p \n';
        return this.exec(sql).then(result => {
            console.log('countProperties', result);
            return result[0].num_properties;
        });
    }
    /**
     * @return {Promise<Object>}
     */
    getGlobalStats() {
        return this.countPersons().then(num_persons => {
            return this.countThings().then(num_things => {
                return this.countProperties().then(num_properties => {
                    const json = {
                        persons: num_persons,
                        things: num_things,
                        properties: num_properties,
                    };
                    const types = Object.keys(Property.types());
                    return this.getGlobalTypesStats(types, json).then(result => {
                        //console.log('getGlobalTypesStats',result)
                        return Promise.resolve(result);
                    });
                });
            });
        });
    }

    /**
     *
     * @param {String[]} types
     * @return {Promise<Object>}
     */
    getGlobalTypesStats(types, json) {
        if (types.length == 0) {
            return Promise.resolve(json);
        } else {
            const propertyType = types[0];
            if (Property.types()[propertyType] === undefined) {
                return Promise.reject(propertyType + " doesn't exist");
            } else {
                return this.countEntitiesByType(propertyType).then(total_entities => {
                    return this.countPropertiesByType(propertyType).then(total_properties => {
                        return this.countValuesByType(propertyType).then(total_values => {
                            json[propertyType] = {
                                entities: total_entities,
                                properties: total_properties,
                                values: total_values,
                            };
                            types.shift();
                            return this.getGlobalTypesStats(types, json);
                        });
                    });
                });
            }
        }
    }

    /**
     * @param {string} propertyType
     * @return {Promise<number>}
     */
    countEntitiesByType(propertyType) {
        if (Property.types()[propertyType] === undefined) {
            return Promise.reject(propertyType + " doesn't exist");
        } else {
            const sql =
                "SELECT COUNT( DISTINCT `entity_id`) AS 'num_entities' \n" +
                'FROM `properties` p \n' +
                'WHERE p.`type` = ? ';
            return this.exec(sql, [propertyType]).then(result => {
                //console.log('countEntityByType',propertyType,result)
                return result[0].num_entities;
            });
        }
    }

    /**
     * @param {string} propertyType
     * @return {Promise<number>}
     */
    countPropertiesByType(propertyType) {
        if (Property.types()[propertyType] === undefined) {
            return Promise.reject(propertyType + " doesn't exist");
        } else {
            const sql =
                "SELECT COUNT( DISTINCT `id`) AS 'num_properties' \n" +
                'FROM `properties` p \n' +
                'WHERE p.`type` = ? ';
            return this.exec(sql, [propertyType]).then(result => {
                //console.log('countPropertiesByType',propertyType,result)
                return result[0].num_properties;
            });
        }
    }

    /**
     *
     * @param {string} propertyType
     * @return {Promise<number>}
     */
    countValuesByType(propertyType) {
        if (Property.types()[propertyType] === undefined) {
            return Promise.reject(propertyType + " doesn't exist");
        } else {
            const n = Property.types()[propertyType].dimensions.length;
            let sql = "SELECT COUNT(`timestamp`) AS 'num_values' \n";
            sql += 'FROM `d' + n + '` ';
            sql += ' JOIN properties `p` ON p.`index_id` = `d' + n + '`.`property_index_id`';
            sql += ' WHERE `p`.type = ?';
            return this.exec(sql, [propertyType]).then(result => {
                //console.log('countValuesByType',result)
                return result[0].num_values;
            });
        }
    }

    /**
     * @param {string} propertyType
     * @return {Promise<number>}
     */
    countEntitiesInRangeByType(propertyType, from, to) {
        if (Property.types()[propertyType] === undefined) {
            return Promise.reject(propertyType + " doesn't exist");
        } else {
            const n = Property.types()[propertyType].dimensions.length;
            let sql = "SELECT COUNT( DISTINCT `entity_id`) AS 'num_entities' \n";
            const data = [];
            sql += 'FROM `properties` p';
            sql += ' LEFT JOIN d' + n + ' d ON d.`property_index_id` = `p`.`index_id`';
            sql += ' WHERE p.`type` = ? ';
            data.push(propertyType);
            if (from !== undefined && to !== undefined) {
                sql += 'AND d.`timestamp` BETWEEN ? AND ? ORDER BY d.`timestamp`';
                data.push(from);
                data.push(to);
            } else if (from !== undefined) {
                sql += 'AND d.`timestamp` >= ? ORDER BY d.`timestamp`';
                data.push(from);
            } else if (to !== undefined) {
                sql += 'AND d.`timestamp` <= ? ORDER BY d.`timestamp`';
                data.push(to);
            } else {
                sql += 'ORDER BY d.`timestamp` DESC LIMIT 1';
            }
            return this.exec(sql, data).then(result => {
                //console.log('countEntityInRangeByType',propertyType,result)
                return result[0].num_entities;
            });
        }
    }

    /**
     * @param {string} propertyType
     * @param {int} from
     * @param {int} to
     * @return {Promise<number>}
     */
    countPropertiesInRangeByType(propertyType, from, to) {
        if (Property.types()[propertyType] === undefined) {
            return Promise.reject(propertyType + " doesn't exist");
        } else {
            const n = Property.types()[propertyType].dimensions.length;
            let sql = "SELECT COUNT( DISTINCT `id`) AS 'num_properties' \n";
            const data = [];
            sql += 'FROM `properties` p';
            sql += ' LEFT JOIN d' + n + ' d ON d.`property_index_id` = `p`.`index_id`';
            sql += ' WHERE p.`type` = ? ';
            data.push(propertyType);
            if (from !== undefined && to !== undefined) {
                sql += 'AND d.`timestamp` BETWEEN ? AND ? ORDER BY d.`timestamp`';
                data.push(from);
                data.push(to);
            } else if (from !== undefined) {
                sql += 'AND d.`timestamp` >= ? ORDER BY d.`timestamp`';
                data.push(from);
            } else if (to !== undefined) {
                sql += 'AND d.`timestamp` <= ? ORDER BY d.`timestamp`';
                data.push(to);
            } else {
                sql += 'ORDER BY d.`timestamp` DESC LIMIT 1';
            }
            return this.exec(sql, data).then(result => {
                //console.log('countEntityInRangeByType',propertyType,result)
                return result[0].num_properties;
            });
        }
    }

    /**
     * @param {string} propertyType
     * @param {int} from
     * @param {int} to
     * @return {Promise<number>}
     */
    countValuesInRangeByType(propertyType, from, to) {
        if (Property.types()[propertyType] === undefined) {
            return Promise.reject(propertyType + " doesn't exist");
        } else {
            const n = Property.types()[propertyType].dimensions.length;
            let sql = "SELECT COUNT(`timestamp`) AS 'num_values' \n";
            const data = [];
            sql += 'FROM `d' + n + '` ';
            sql += ' JOIN properties `p` ON p.`index_id` = `d' + n + '`.`property_index_id`';
            sql += ' WHERE `p`.type = ?';
            data.push(propertyType);
            if (from !== undefined && to !== undefined) {
                sql += 'AND `timestamp` BETWEEN ? AND ? ORDER BY `timestamp`';
                data.push(from);
                data.push(to);
            } else if (from !== undefined) {
                sql += 'AND `timestamp` >= ? ORDER BY `timestamp`';
                data.push(from);
            } else if (to !== undefined) {
                sql += 'AND `timestamp` <= ? ORDER BY `timestamp`';
                data.push(to);
            } else {
                sql += 'ORDER BY `timestamp` DESC LIMIT 1';
            }
            return this.exec(sql, data).then(result => {
                //console.log('countValuesByType',result)
                return result[0].num_values;
            });
        }
    }

    /**
     *
     * @param {string[]} types
     * @param {int} from
     * @param {int} to
     * @return {Promise<Object>}
     */
    getTypesStats(types, from, to) {
        const json = {
            types: [],
            total_properties: 0,
            total_entities: 0,
            total_values: 0,
            range: {
                from: from,
                to: to,
                properties: 0,
                entities: 0,
                values: 0,
            },
        };
        return this.fillTypesStatsJson(types, from, to, json).then(result => {
            //console.log('fillTypesStatsJson',result)
            return Promise.resolve(result);
        });
    }

    /**
     *
     * @param {string[]} types
     * @param {int} from
     * @param {int} to
     * @param {object} json
     * @return {Promise<Object>}
     */
    fillTypesStatsJson(types, from, to, json) {
        if (types.length == 0) {
            return Promise.resolve(json);
        } else {
            const propertyType = types[0];
            if (Property.types()[propertyType] === undefined) {
                return Promise.reject(propertyType + " doesn't exist");
            } else {
                return this.countEntitiesByType(propertyType).then(total_entities => {
                    return this.countPropertiesByType(propertyType).then(total_properties => {
                        return this.countValuesByType(propertyType).then(total_values => {
                            return this.countEntitiesInRangeByType(propertyType, from, to).then(num_entities => {
                                return this.countPropertiesInRangeByType(propertyType, from, to).then(
                                    num_properties => {
                                        return this.countValuesInRangeByType(propertyType, from, to).then(
                                            num_values => {
                                                json.total_entities += total_entities;
                                                json.total_properties += total_properties;
                                                json.total_values += total_values;
                                                json.range.entities += num_entities;
                                                json.range.properties += num_properties;
                                                json.range.values += num_values;
                                                json.types.push(types.shift());
                                                return this.fillTypesStatsJson(types, from, to, json);
                                            },
                                        );
                                    },
                                );
                            });
                        });
                    });
                });
            }
        }
    }
}
