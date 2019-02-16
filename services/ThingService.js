'use strict';

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd:things]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const policies = require('../lib/policies');
const idGen = require('../lib/id');

class ThingService {

    /**
     *
     * @constructor
     */
    constructor(newModel) {
        this.model = newModel;
    }

    /**
     * Create a new Thing.
     *
     * @param {String} actorId
     * @param {Thing} thing
     * @param {boolean} jwt
     * returns Thing
     **/
    create(actorId, thing, jwt) {
        return this.model.things.read(thing.id)
            .then((retrievedThing) => {// Read positive, the Thing already exist
                return Promise.reject({
                    code: 400,
                    message: 'Thing ' + retrievedThing.id + ' already exist.'
                });
            })
            .catch((error) => { // Read negative, the Thing does not exist yet
                if (error.code === 404) {
                    logger.debug('create: Thing does not exist, ' +
                        'sending it to Kafka and creating ACPs');

                    return this.model.dao.createThing(thing)
                        .then(() => {
                            // Publish the thing to kafka
                            return this.toKafka(thing);
                        })
                        .then( () => {
                            return this.model.dao.createRole(
                                thing.id, actorId, 'owner');
                        })
                        .then(() => {
                            logger.debug('create: Sent to kafka');
                            return createAccessPolicy(thing.id);
                        })
                        .then(() => {
                            return createOwnerAccessPolicy(thing.id, actorId);
                        })
                        .then(() => {
                            return this.generateKeys(thing.id);
                        })
                        .then((keys) => {
                            if (jwt) {
                                keys.jwt = this.model
                                    .auth.generateJWT(keys.privateKey);
                            }
                            thing.keys = keys;
                            return Promise.resolve(thing);
                        })
                        .catch( (error) => {
                            return Promise.reject(error);
                        });
                } else {
                    return Promise.reject(error);
                }
            });
    }

    /**
     * List some Things.
     * @param {String} actorId
     **/
    list(actorId) {
        return this.model.dao.listThings(actorId);
    }


    /**
     * Read a Thing.
     * @param {String} id
     * returns {Thing}
     **/
    read(id) {
        let thing = {};
        return this.model.dao.readThing(id)
            .then((result) => {
                thing = result;
                return this.model.properties.list(id)
                    .then((results) => {
                        thing.properties = results;
                        return Promise.resolve(removePrefixThing(thing));
                    });
            }).catch((error) => {
                return Promise.reject(error);
            });
    }

    /**
     * Update a Thing
     * @param thingId
     * returns Promise
     **/
    update(thingId) {
        return this.model.dao.updateThing(thingId);
    }

    /**
     * Delete a thing
     * @param thingId
     * @return {Promise}
     */
    del(thingId) {
        return this.model.dao.deleteThing(thingId);
    }

    /**
     * Send Thing to Kafka.
     * @param {Thing} thing
     */
    toKafka(thing) {
        return this.model.kafka.pushData('things', [thing], thing.id);
    }

    /**
     * Generate a JWK set of keys for a given thing id.
     * @param {String} thingId
     * @returns {Promise<KeySet>}
     */
    generateKeys(thingId) {
        const jwkParams = {
            kid: idGen.uuidv4(),
            alg: 'RS256'
        };
        return this.model.auth.refresh().then( () => {
            return this.model.auth.generateJWK(thingId, jwkParams);
        });
    }

}

module.exports = ThingService;

/**
 * Generate an access policy for a thing.
 * @param thingId
 * @returns {Promise<>}
 */
function createAccessPolicy(thingId) {
    const thingPolicy = {
        id: thingId + '-' + thingId + '-cru-policy',
        effect: 'allow',
        actions: [
            'dcd:actions:create',
            'dcd:actions:read',
            'dcd:actions:update'
        ],
        subjects: ['dcd:things:' + thingId],
        resources: ['dcd:things:' + thingId,
            'dcd:things:' + thingId + ':properties',
            'dcd:things:' + thingId + ':properties:<.*>'],
    };
    logger.debug('Thing policy: ' + JSON.stringify(thingPolicy));
    return policies.create(thingPolicy);
}


/**
 * Generate an access policy for the owner of a thing.
 * @param thingId
 * @param subject
 * @returns {Promise<>}
 */
function createOwnerAccessPolicy(thingId, subject) {
    const thingOwnerPolicy = {
        id: thingId + '-' + subject + '-clrud-policy',
        effect: 'allow',
        actions: [
            'dcd:actions:create',
            'dcd:actions:list',
            'dcd:actions:read',
            'dcd:actions:update',
            'dcd:actions:delete'
        ],
        subjects: [subject],
        resources: ['dcd:things:' + thingId,
            'dcd:things:' + thingId + ':properties',
            'dcd:things:' + thingId + ':properties:<.*>']
    };
    return policies.create(thingOwnerPolicy);
}

const removePrefixThing = (thing) => {
    thing.id = thing.id.replace('things:', '');
    return thing;
};