'use strict';

// Setting the logs
import log4js = require('log4js');
const logger = log4js.getLogger('[MySQL:Test]');
logger.level = process.env.LOG_LEVEL || 'INFO';

import { Person } from '../model/Person';
import { Thing } from '../model/Thing';
import { Property } from '../model/Property';
import { Class } from '../model/Class';

import { MySQLStore } from '../store/MySQLStore';
const mysql = new MySQLStore();

const host = process.env.MODEL_HOST || 'localhost';
const user = process.env.MODEL_USER || 'root';
const pass = process.env.MODEL_PASS || 'example';
const name = process.env.MODEL_NAME || 'dcdhub';

mysql.connect(host, user, pass, name);

const person = new Person('Test Person', 'password');
const thing = new Thing('Test Thing', 'a test of thing', 'Smart phone');
const property = new Property('Test property', 'test of prop', 'ACCELEROMETER');
const classProperty = new Property('Test class property', 'test of class prop', 'CLASS');

// Test: Create person
mysql
    .createPerson(person)

    // Test: Create role owner for thing
    .then(() => {
        return mysql.createRole(person.id, person.id, 'owner');
    })

    // Test: Read person
    .then(() => {
        return mysql.readPerson(person.id);
    })

    // Test: Check person credentials
    .then(() => {
        return mysql.checkCredentials(person.id, person.password);
    })

    // Test: List persons
    .then(retrievedPerson => {
        logger.debug(retrievedPerson);
        return mysql.listPersons(person.id);
    })

    // Test: Update person
    .then(persons => {
        logger.debug(persons);
        persons[0].name = persons[0].name + ' Updated';
        return mysql.updatePerson(persons[0]);
    })

    // Test: Create thing
    .then(() => {
        return mysql.createThing(thing);
    })

    // Test: Create role owner for thing
    .then(() => {
        return mysql.createRole(thing.id, person.id, 'owner');
    })

    // Test: Read thing
    .then(() => {
        return mysql.readThing(thing.id);
    })

    // Test: List things
    .then(() => {
        return mysql.listThings(person.id);
    })

    // Test: Update thing
    .then(things => {
        logger.debug(things);
        things[0].name = things[0].name + ' Updated';
        return mysql.updateThing(thing);
    })

    // Test: Create ACCELEROMETER property
    .then(() => {
        property.entityId = thing.id;
        return mysql.createProperty(property);
    })

    // Test: Read ACCELEROMETER property
    .then(() => {
        return mysql.readProperty(thing.id, property.id);
    })

    // Test: Create CLASS property
    .then(() => {
        classProperty.entityId = thing.id;
        return mysql.createProperty(classProperty);
    })

    // Test: Create Class
    .then(() => {
        const dimensionId = classProperty.dimensions[0];
        const clazz = new Class('testClass', 0, dimensionId, 'Test class');
        return mysql.insertClasses(dimensionId, [clazz]);
    })

    // Test: Read CLASS property with class
    .then(() => {
        return mysql.readProperty(thing.id, classProperty.id);
    })

    // Test: Read ACCELEROMETER property
    .then(() => {
        return mysql.readProperty(thing.id, property.id);
    })

    // Test: List properties
    .then(() => {
        return mysql.listProperties(thing.id);
    })

    // Test: Update property
    .then(properties => {
        logger.debug(properties);
        properties[0].name = properties[0].name + ' Updated';
        return mysql.updateProperty(properties[0]);
    })

    // Test: Update values
    .then(() => {
        property.addValues([[Date.now(), 1, 2, 3], [Date.now(), 3, 2, 1]]);
        logger.debug(property);
        return mysql.updatePropertyValues(property);
    })

    // Test: Read property values
    .then(() => {
        return mysql.readPropertyValues(property, Date.now() - 1000, Date.now());
    })

    // Test: Delete property
    .then(propertyWithValues => {
        logger.debug(propertyWithValues);
        return mysql.deleteProperty(thing.id);
    })

    // Test: Delete thing
    .then(() => {
        return mysql.deleteThing(thing.id);
    })

    // Test: Delete person
    .then(() => {
        return mysql.deletePerson(person.id);
    })

    .then(() => {
        return mysql.countPropertiesByType(property.type);
    });
