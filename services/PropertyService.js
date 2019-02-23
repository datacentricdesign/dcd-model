'use strict';

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd:properties]');
logger.level = process.env.LOG_LEVEL || 'INFO';

class PropertyService {

    /**
     *
     * @constructor
     */
    constructor(newModel) {
        this.model = newModel;
    }

    /**
     * Create a new Property.
     * @param {Property} property
     * returns Property
     **/
    create(property) {
        return this.model.dao.createProperty(property)
            .then(() => {
                // Publish the property to kafka
                return this.toKafka(property)
                    .then(() => {
                        return Promise.resolve(property);
                    })
                    .catch((error) => {
                        return Promise.reject(error);
                    });
            })
            .catch((error) => {
                return Promise.reject(error);
            });
    }

    read(entityId, propertyId, from=undefined, to=undefined) {
        return this.model.dao.readProperty(entityId, propertyId)
            .then((property) => {
                if (from !== undefined && to !== undefined) {
                    return this.model.dao.readPropertyValues(property, from, to)
                }
            })
            .catch((error) => {
                return Promise.reject(error);
            });
    }

    /**
     * @param property
     * @return {*}
     */
    update(property) {
        return this.model.dao.updateProperty(property)
            .then(() => {
                // Publish the property values to kafka
                return this.toKafka(property);
            })
            .catch((error) => {
                return Promise.reject(error);
            });
    }

    /**
     * @param property
     * @return {*}
     */
    updateValues(property) {
        if (property.values === undefined || property.values.length === 0) {
            return Promise.resolve();
        }
        return this.model.dao.updatePropertyValues(property)
            .then(() => {
                // Publish the property values to kafka
                return this.valuesToKafka(property.values, property.id);
            })
            .catch((error) => {
                return Promise.reject(error);
            });
    }

    /**
     * @param propertyId
     * @return {Promise<Property[]>}
     */
    list(propertyId) {
        return this.model.dao.listProperties(propertyId);
    }

    /**
     * Delete a property
     * @param propertyId
     * @return {Promise}
     */
    del(propertyId) {
        return this.model.dao.deleteProperty(propertyId);
    }

    /**
     * Send Property to Kafka.
     * @param {Property} property
     */
    toKafka(property) {
        return this.model.kafka.pushData('properties', [property], property.id);
    }

    /**
     * Send values to Kafka.
     * @param {Array} values
     * @param {String} key - thingId-propertyId
     */
    valuesToKafka(values, key) {
        return this.model.kafka.pushData('values', values, key);
    }

}

module.exports = PropertyService;