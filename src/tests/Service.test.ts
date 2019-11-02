'use strict';

// Setting the logs
import log4js = require('log4js');
const logger = log4js.getLogger('[OAuth:Test]');
logger.level = process.env.LOG_LEVEL || 'INFO';

import assert = require('assert');

// Load the model
import { Thing } from '../model/Thing';
import { Person } from '../model/Person';
import { Property } from '../model/Property';

import { DCDModel } from '../index';
const model = new DCDModel();

const password = 'password';
const person = new Person('Test', password);
const thing = new Thing('test', 'test thing desc', 'Smart phone');
const property = new Property('test property', 'test desc', 'ACCELEROMETER');

model
    .init()

    // Test: create a Person
    .then(() => {
        return model.persons.create(person);
    })

    // Test: list person that 'Test' has access to
    .then(personId => {
        // personId should be the result of create()
        return model.persons.list(personId);
    })

    // Test: update Person
    .then(persons => {
        assert.equal(persons.length, 1, 'List of persons should have 1 element.');
        persons[0].name = persons[0].name + ' Updated';
        return model.persons.update(persons[0]);
    })

    // Test: read person
    .then(() => {
        return model.persons.read(person.id);
    })

    // Test: check person
    .then(() => {
        return model.persons.check(person.id, password);
    })

    // Test: check (correct password)
    .then(result => {
        assert.equal(result.valid, true, 'Person check should return true');
        return model.persons.check(person.id, password + 'wrong');
    })

    // Test: create thing
    .then(result => {
        assert.equal(result.valid, false, 'Person check should return false');
        return model.things.create(person.id, thing, true);
    })

    // Test: list things that 'Test' has access to
    .then(() => {
        return model.things.list(person.id);
    })

    // Test: read Thing
    .then(things => {
        assert.equal(things.length, 1, 'List of things should have 1 element.');
        things[0].name = things[0].name + ' Updated';
        return model.things.update(things[0]);
    })

    // Test: update Thing
    .then(() => {
        return model.things.read(thing.id);
    })

    // Test: create a property of the thing
    .then(() => {
        property.entityId = thing.id;
        return model.properties.create(property);
    })

    // Test: read property
    .then(() => {
        return model.properties.read(thing.id, property.id);
    })

    // Test: list property of a thing
    .then(() => {
        return model.properties.list(thing.id);
    })

    // Test: update a property
    .then(properties => {
        assert.equal(properties.length, 1, 'List of properties should have 1 element.');
        properties[0].name = properties[0].name + ' Updated';
        return model.properties.update(properties[0]);
    })

    // Test: update values of a property
    .then(() => {
        const updatedProperty = new Property({
            id: property.id,
            values: [[Date.now(), 4, 5, 6]],
        });
        return model.properties.updateValues(updatedProperty);
    })

    // Test: delete property
    .then(() => {
        return model.properties.del(property.id);
    })

    // Test: delete thing
    .then(() => {
        return model.things.del(thing.id);
    })

    // Test: delete person
    .then(() => {
        return model.persons.del(person.id);
    });
