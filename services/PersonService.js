"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:persons]");
logger.level = process.env.LOG_LEVEL || "INFO";

const Person = require("../entities/Person");
const DCDError = require("../lib/Error");

class PersonService {
  /**
   *
   * @constructor
   */
  constructor(newModel) {
    this.model = newModel;
  }

  /**
   * Create a new Person
   * @param {Person} person
   * @return {Promise<Person|DCDError>}
   **/
  create(person) {
    if (person.id === undefined) {
      return Promise.reject(new DCDError(4001, "Add field id."));
    }
    if (person.name === undefined) {
      return Promise.reject(new DCDError(4001, "Add field name."));
    }
    if (person.password === undefined) {
      return Promise.reject(new DCDError(4001, "Add field password."));
    }
    return (
      this.model.dao
        .readPerson(person.id)
        // Read positive, the Person already exist
        .then(retrievedPerson => {
          return Promise.reject(
            new DCDError(
              4002,
              "Provide a different id from " + retrievedPerson.id + "."
            )
          );
        })
        // Read negative, the Thing does not exist yet
        .catch(error => {
          if (error.code === 404) {
            return this.model.dao
              .createPerson(person)
              .then(() => {
                return this.model.dao.createRole(person.id, person.id, "owner");
              })
              .then(() => {
                // Publish the person to kafka
                return this.toKafka(person);
              })
              .then(() => {
                // Give user role to the new Person on the DCD Hub
                return this.model.policies.createPolicy(
                  person.id,
                  "dcd",
                  "user"
                );
              })
              .then(() => {
                // Give owner role to the new Person on the new Person
                return this.model.policies.createPolicy(
                  person.id,
                  person.id,
                  "owner"
                );
              })
              .then(() => {
                logger.debug(person.id);
                return Promise.resolve(person.id);
              })
              .catch(error => {
                return Promise.reject(error);
              });
          } else {
            return Promise.reject(error);
          }
        })
    );
  }

  /**
   * @param {String} personId
   * @returns {*}
   */
  list(personId) {
    return this.model.dao.listPersons(personId);
  }

  /**
   * @param {String} personId
   * @returns {*}
   */
  read(personId) {
    return this.model.dao.readPerson(personId);
  }

  update(person) {
    return this.model.dao.updatePerson(person);
  }

  /**
   * @param {String} personId
   * @param {String} password (plain text)
   * @returns {*}
   */
  check(personId, password) {
    return this.model.dao.checkCredentials(
      personId,
      Person.encryptPassword(password)
    );
  }

  /**
   * @param {String} personId
   */
  del(personId) {
    return this.model.dao.deletePerson(personId);
  }

  /**
   * Send Person to Kafka.
   * @param {Person} person
   */
  toKafka(person) {
    this.model.kafka.pushData("persons", [person], person.id);
  }
}

module.exports = PersonService;
