// Load environment variables
require('dotenv').config()

let chai = require('chai')

// const SQLite3 = require('sqlite3').verbose()
// const db = new SQLite3.Database(':memory:')
// const fs = require('fs')

let expect = chai.expect

const DCDModel = require('../index')
const Person = require('../entities/Person')
const Thing = require('../entities/Thing')
const Property = require('../entities/Property')

describe('Services', function () {

  let model

  const password = 'password'
  const testPerson = new Person('Test', password)

  const testThing = new Thing('test', 'test thing desc', 'Smart phone')
  const testProperty = new Property('test property', 'test desc', 'ACCELEROMETER')

  before(function () {
    // runs before all tests in this block
    model = new DCDModel()
    return model.init()
  })

  describe('Create Person', function () {
    it('Should create a Person', function (done) {
      model.persons.create(testPerson).then((personId) => {
        expect(personId).to.not.equal(undefined, 'The resulting thing should have an id.')
        testPerson.id = personId
        done()
      })
    })
  })

  describe('List Persons', function () {
    it('Should list Persons', function (done) {
      model.persons.list(testPerson.id).then((persons) => {
        expect(persons.length).to.equal( 1, 'List of persons should have 1 element.')
        done()
      })
    })
  })

  describe('Update Person', function () {
    it('Should update a Person', function (done) {
      testPerson.name = testPerson.name + ' Updated'
      model.persons.update(testPerson).then((result) => {
        expect(result).to.equal(undefined, 'The result should be empty.')
        done()
      })
    })
  })

  describe('Read Person', function () {
    it('Should read a Person', function (done) {
      model.persons.read(testPerson.id).then((person) => {
        expect(testPerson.name).to.equal(person.name, 'The resulting person should contain the provided name.')
        done()
      })
    })
  })

  describe('Check Valid Person', function () {
    it('Should validate a Person', function (done) {
      model.persons.check(testPerson.id, password).then((result) => {
        expect(result.valid).to.equal(true, 'Person check should return true')
        done()
      })
    })
  })

  describe('Check not valid Person', function () {
    it('Should not validate a Person', function (done) {
      model.persons.check(testPerson.id, password + 'wrong').then((result) => {
        expect(result.valid).to.equal(false, 'Person check should return false')
        done()
      })
    })
  })

  describe('Create Thing', function () {
    it('Should create a Thing', function (done) {
      model.things.create(testPerson.id, testThing, false).then((thing) => {
        expect(thing.id).to.not.equal(undefined, 'The resulting thing should have an id.')
        testThing.id = thing.id
        done()
      })
    })
  })

  describe('List Things', function () {
    it('Should list the (1) Things of the test person', function (done) {
      model.things.list(testPerson.id).then((things) => {
        expect(things.length).to.equal(1, 'List of things should have 1 element.')
        done()
      })
    })
  })

  describe('Update Thing', function () {
    it('Should update the name of the test Thing', function (done) {
      testThing.name = testThing.name + ' Updated'
      model.things.update(testThing).then((result) => {
        expect(result).to.equal(undefined, 'The result should be empty.')
        done()
      })
    })
  })

  describe('Read Thing', function () {
    it('Should read the details of the test Thing', function (done) {
      testThing.name = testThing.name + ' Updated'
      model.things.read(testThing.id).then((thing) => {
        expect(testThing.id).to.equal(thing.id, 'The resulting thing should contain an id.')
        done()
      })
    })
  })

  describe('Create a Thing Property', function () {
    it('Should read the details of the test Thing', function (done) {
      testProperty.entityId = testThing.id
      model.properties.create(testProperty).then((property) => {
        expect(property.id).to.not.equal(undefined, 'The resulting property should have an id.')
        testProperty.id = property.id
        console.log(testProperty)
        done()
      })
    })
  })

  describe('Read a Thing Property', function () {
    it('Should read the details of the test Property', function (done) {
      model.properties.read(testProperty.entityId, testProperty.id).then((property) => {
        expect(testProperty.id).to.equal(property.id, 'The resulting property should contain an id.')
        done()
      }).catch( (error) => {
        console.error(error);
        expect(error).to.equal(undefined, 'No error should be thrown')
        done()
      })
    })
  })

  describe('List a Thing Properties', function () {
    it('Should list the properties of a given Thing', function (done) {
      model.properties.list(testThing.id).then((properties) => {
        expect(properties.length).to.equal(1, 'List of properties should have 1 element.')
        done()
      })
    })
  })

  describe('Update a Thing Property', function () {
    it('Should update the name of a property', function (done) {
      testProperty.name = testProperty.name + ' Updated'
      model.properties.update(testProperty).then((result) => {
        expect(result).to.equal(undefined, 'The result should be empty.')
        done()
      })
    })
  })

  describe('Update Property Values', function () {
    it('Should update the values of a property', function (done) {
      testProperty.values = [[Date.now(), 4, 5, 6]]
      console.log(testProperty)
      model.properties.updateValues(testProperty).then(() => {
        done()
      })
    })
  })

  describe('Delete Property', function () {
    it('Should delete a Property', function (done) {
      model.properties.del(testProperty.id).then(() => {
        model.properties.list(testThing.id).then((properties) => {
          expect(properties.length).to.equal(0, 'List of properties should have 0 element.')
          done()
        })
      })
    })
  })

  describe('Delete Thing', function () {
    it('Should delete a Thing', function (done) {
      model.things.del(testThing.id).then(() => {
        model.things.list(testPerson.id).then((things) => {
          expect(things.length).to.equal(0, 'List of things should have 0 element.')
          done()
        })
      })
    })
  })

  describe('Delete Person', function () {
    it('Should delete a Person', function (done) {
      model.persons.del(testPerson.id).then(() => {
        model.persons.read(testPerson.id).then((result) => {
          expect(result).to.be.a("DCDError")
          done()
        }).catch( (error) => {
          expect(error.errorCode).to.equal(404)
          done()
        })
      })
    })
  })

  after(function () {
    // runs after all tests in this block
    model.shutdown()
  })
})
