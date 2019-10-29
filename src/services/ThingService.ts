'use strict';

// Setting the logs
import { Service } from './Service';

import { uuidv4 } from '../lib/id';
import { DCDError } from '../lib/Error';
import { KeySet } from '../lib/Auth';

export class ThingService extends Service {
    /**
     * Create a new Thing.
     *
     * @param {string} actorId
     * @param {Thing} thing
     * @param {boolean} jwt
     * returns Thing
     **/
    create(actorId, thing, jwt): Promise<Thing> {
        if (thing.id === undefined) {
            return Promise.reject(new DCDError(4003, 'Add field id.'));
        }
        if (thing.name === undefined || thing.name === '') {
            return Promise.reject(new DCDError(4003, 'Add field name.'));
        }
        if (thing.type === undefined || thing.type === '') {
            return Promise.reject(new DCDError(4003, 'Add field type.'));
        }
        return this.model.things
            .read(thing.id)
            .then(retrievedThing => {
                // Read positive, the Thing already exist
                return Promise.reject({
                    code: 400,
                    message: `Thing ${retrievedThing.id} already exist.`,
                });
            })
            .catch(error => {
                // Read negative, the Thing does not exist yet
                if (error.code === 404) {
                    this.logger.debug('create: Thing does not exist, sending it to Kafka and creating ACPs');

                    return this.model.dao
                        .createThing(thing)
                        .then(() => {
                            // Publish the thing to kafka
                            return this.toKafka(thing);
                        })
                        .then(() => {
                            // Give owner role to the current user on the new Thing
                            this.logger.debug('new thing owner');
                            return this.model.policies.grant(actorId, thing.id, 'owner');
                        })
                        .then(() => {
                            // Give subject role to the new Thing
                            this.logger.debug('new thing subject');
                            return this.model.policies.grant(thing.id, thing.id, 'subject');
                        })
                        .then(() => {
                            if (thing.pem !== undefined) {
                                return this.model.auth.setPEM(thing.id, thing.pem);
                            } else if (jwt) {
                                this.logger.debug('new thing jwt');
                                return this.generateKeys(thing.id);
                            }
                        })
                        .then(keys => {
                            if (keys !== undefined) {
                                thing.keys = keys;
                                if (jwt) {
                                    keys.jwt = this.model.auth.generateJWT(keys.privateKey);
                                }
                            }
                            this.logger.debug('new thing done');
                            return Promise.resolve(thing);
                        })
                        .catch(error => {
                            return Promise.reject(error);
                        });
                } else {
                    return Promise.reject(error);
                }
            });
    }

    /**
     * List some Things.
     * @param {string} actorId
     **/
    list(actorId): Promise<Thing[]> {
        return this.model.dao.listThings(actorId);
    }

    /**
     * Read a Thing.
     * @param {string} id
     * returns {Thing}
     **/
    read(id: string): Promise<Thing> {
        let thing;
        return this.model.dao
            .readThing(id)
            .then(result => {
                thing = result;
                return this.model.properties.list(id);
            })
            .then(results => {
                thing.properties = results;
                return Promise.resolve(thing);
            })
            .catch(error => {
                return Promise.reject(error);
            });
    }

    /**
     * Update a Thing
     * @param thingId
     * returns Promise<void>
     **/
    update(thingId): Promise<void> {
        return this.model.dao.updateThing(thingId);
    }

    /**
     * Delete a thing
     * @param thingId
     * @return {Promise}
     */
    del(thingId): Promise<number> {
        return this.model.dao.deleteThing(thingId).then(result => {
            if (result.affectedRows > 0) {
                return Promise.resolve(result.affectedRows);
            }
            return Promise.reject(new DCDError(404, `Thing to delete ${thingId} could not be not found.`));
        });
    }

    /**
     * Send Thing to Kafka.
     * @param {Thing} thing
     */
    toKafka(thing: Thing): Promise<void> {
        return this.model.kafka.pushData('things', [thing], thing.id);
    }

    /**
     * Generate a JWK set of keys for a given thing id.
     * @param {string} thingId
     * @returns {Promise<Object>}
     */
    generateKeys(thingId: string): Promise<KeySet> {
        const jwkParams = {
            kid: uuidv4(),
            alg: 'RS256',
            use: 'sig',
        };
        return this.model.auth.refresh().then(() => {
            return this.model.auth.generateJWK(thingId, jwkParams);
        });
    }
}
