'use strict';

import { DeletionReport, Service } from './Service';

import { Person } from '../entities/Person';
import { DCDError } from '../lib/Error';

export class PersonService extends Service {
    /**
     * Create a new Person
     * @param {Person} person
     * @return {Promise<Person|DCDError>}
     **/
    create(person): Promise<string> {
        if (person.id === undefined) {
            return Promise.reject(new DCDError(4001, `Add field id.`));
        }
        if (person.name === undefined) {
            return Promise.reject(new DCDError(4001, `Add field name.`));
        }
        if (person.password === undefined) {
            return Promise.reject(new DCDError(4001, `Add field password.`));
        }
        return (
            this.model.dao
                .readPerson(person.id)
                // Read positive, the Person already exist
                .then(retrievedPerson => {
                    return Promise.reject(new DCDError(4002, `Provide a different id from ${retrievedPerson.id}.`));
                })
                // Read negative, the Thing does not exist yet
                .catch(error => {
                    if (error.code === 404) {
                        return this.model.dao
                            .createPerson(person)
                            .then(() => {
                                // Publish the person to kafka
                                return this.toKafka(person);
                            })
                            .then(() => {
                                // Give user role to the new Person on the DCD Hub
                                return this.model.policies.grant(person.id, 'dcd', 'user');
                            })
                            .then(() => {
                                // Give owner role to the new Person on the new Person
                                return this.model.policies.grant(person.id, person.id, 'owner');
                            })
                            .then(() => {
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
    list(personId): Promise<Person[]> {
        return this.model.dao.listPersons(personId);
    }

    /**
     * @param {String} personId
     * @returns {*}
     */
    read(personId): Promise<Person> {
        return this.model.dao.readPerson(personId);
    }

    /**
     *
     * @param person
     */
    update(person): Promise<void> {
        return this.model.dao.updatePerson(person);
    }

    /**
     * @param {String} personId
     * @param {String} password (plain text)
     * @returns {*}
     */
    check(personId, password): Promise<JSONCheck> {
        let id = personId;
        if (!id.startsWith('dcd:persons:')) {
            id = 'dcd:persons:' + id;
        }
        return this.model.dao.checkCredentials(id, Person.encryptPassword(password));
    }

    /**
     * @param {String} personId
     */
    del(personId): Promise<DeletionReport> {
        return this.model.dao.deletePerson(personId).then(result => {
            if (result.affectedRows > 0) {
                return Promise.resolve({
                    received: 1,
                    deleted: result.affectedRows,
                });
            }
            return Promise.reject(new DCDError(404, `Person to delete ${personId} could not be not found.`));
        });
    }

    /**
     * Send Person to Kafka.
     * @param {Person} person
     */
    toKafka(person): Promise<void> {
        return this.model.kafka.pushData('persons', [person], person.id);
    }
}

export interface JSONCheck {
    valid: boolean;
}
