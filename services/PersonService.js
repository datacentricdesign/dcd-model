'use strict';

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd:persons]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const Person = require('../entities/Person');
const policies = require('../lib/policies');

const grafana = require('../lib/grafana');
grafana.getAPIKey();

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
     * @return {Promise<Person|Error>}
     **/
    create(person) {
        return this.model.dao.readPerson(person.id)

        // Read positive, the Person already exist
            .then((retrievedPerson) => {
                return Promise.reject({
                    code: 400,
                    message: 'Person ' + retrievedPerson.id + ' already exist.'
                });
            })

            // Read negative, the Thing does not exist yet
            .catch((error) => {
                if (error.code === 404) {
                    return this.model.dao.createPerson(person)
                        .then(() => {
                            // Publish the person to kafka
                            return this.toKafka(person);
                        })
                        .then( () => {
                            return this.model.dao.createRole(
                                person.id, person.id, 'owner');
                        })
                        .then(() => {
                            return createDCDAccessPolicy(person.id);
                        })
                        .then(() => {
                            return createResourcePolicy(person.id);
                        })
                        .then(() => {
                            return createPersonCRUDPolicy(person.id);
                        })
                        .then(() => {
                            return grafana.createGlobalUser(person);
                        })
                        .then(() => {
                            logger.debug(person.id);
                            return Promise.resolve(person.id);
                        })
                        .catch((error) => {
                            return Promise.reject(error);
                        });
                } else {
                    return Promise.reject(error);
                }
            });
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
            personId, Person.encryptPassword(password));
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
        this.model.kafka.pushData('persons', [person], person.id);
    }

}

module.exports = PersonService;

/**
 *
 * @param personId
 * @returns {*}
 */
function createDCDAccessPolicy(personId) {
    return policies.create({
        id: personId + '-' + personId + '-r-policy',
        effect: 'allow',
        actions: ['dcd:actions:read'],
        subjects: ['dcd:persons:' + personId],
        resources: ['dcd'],
    });
}

/**
 * @param {String} personId
 * @returns Promise<>
 */
function createResourcePolicy(personId) {
    return policies.create({
        id: personId + '-' + personId + '-cl-policy',
        effect: 'allow',
        actions: ['dcd:actions:create', 'dcd:actions:list'],
        subjects: ['dcd:persons:' + personId],
        resources: ['dcd:things',
            'dcd:persons']
    });
}

/**
 * @param {String} personId
 * @returns Promise<>
 */
function createPersonCRUDPolicy(personId) {
    return policies.create({
        id: personId + '-' + personId + '-crud-policy',
        effect: 'allow',
        actions: [
            'dcd:actions:create',
            'dcd:actions:read',
            'dcd:actions:update',
            'dcd:actions:delete'
        ],
        subjects: ['dcd:persons:' + personId],
        resources: ['dcd:persons:' + personId,
            'dcd:persons:' + personId + ':properties',
            'dcd:persons:' + personId + ':properties:<.*>'],
    });
}
