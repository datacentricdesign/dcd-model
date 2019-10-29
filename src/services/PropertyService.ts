'use strict';

// Setting the logs
import {CreationReport, Service} from './Service';
import { Property } from '../entities/Property';
import { Class } from '../entities/Class';

export class PropertyService extends Service {
    propertyMap: {};
    /**
     * Create a new Property.
     * @param {Property} property
     * returns Property
     **/
    create(property: Property): Promise<Property> {
        return this.model.dao
            .createProperty(property)
            .then(() => {
                // Publish the property to kafka
                return this.toKafka(property)
                    .then(() => {
                        return Promise.resolve(property);
                    })
                    .catch(error => {
                        return Promise.reject(error);
                    });
            })
            .catch(error => {
                return Promise.reject(error);
            });
    }

    /**
     * @param {string} entityId
     * @param {string} propertyId
     * @param {int} from
     * @param {int} to
     * @param {string} interval
     * @param {string} fctInterval
     * @param {string} fill
     * @param {string} dao
     * @return {Promise<Property>}
     */
    read(
        entityId: string,
        propertyId: string,
        from: number = undefined,
        to: number = undefined,
        interval: number = undefined,
        fctInterval = 'MEAN',
        fill = 'none',
        dao = 'mysql',
    ): Promise<Property> {
        return this.model.dao
            .readProperty(entityId, propertyId)
            .then(property => {
                if (from !== undefined && to !== undefined) {
                    if (dao === 'influx') {
                        return this.model.influxdb.readPropertyValues(property, from, to, interval, fctInterval, fill);
                    } else {
                        return this.model.dao.readPropertyValues(property, from, to);
                    }
                } else {
                    return Promise.resolve(property);
                }
            })
            .catch(error => {
                return Promise.reject(error);
            });
    }

    /**
     * @param property
     * @return {*}
     */
    update(property): Promise<void> {
        return this.model.dao
            .updateProperty(property)
            .then(updated => {
                // Publish the property values to kafka
                if (updated) {
                    return this.toKafka(property);
                }
                return Promise.resolve();
            })
            .catch(error => {
                return Promise.reject(error);
            });
    }

    /**
     * @param property
     * @return {*}
     */
    updateValues(property): Promise<CreationReport> {
        if (property.values === undefined || property.values.length === 0) {
            return Promise.resolve({
                received: 0,
                stored: 0,
                duplicates: 0,
                malformed: 0,
                timestampAdded: 0,
            });
        }

        if (property.dimensions === undefined) {
            const ref = property.entityId + '_' + property.id;
            if (this.propertyMap[ref] === undefined) {
                return this.read(property.entityId, property.id)
                    .then(retrievedProperty => {
                        this.propertyMap[ref] = retrievedProperty;
                    })
                    .then(() => {
                        return this.updateValues(property);
                    });
            }
            property.dimensions = this.propertyMap[ref].dimensions;
            property.indexId = this.propertyMap[ref].indexId;
        }

        return this.model.dao
            .updatePropertyValues(property)
            .then(report => {
                // Publish the property values to kafka
                return this.valuesToKafka(property).then(() => {
                    return Promise.resolve(report);
                });
            })
            .catch(error => {
                return Promise.reject(error);
            });
    }

    /**
     * @param propertyId
     * @return {Promise<Property[]>}
     */
    list(propertyId: string): Promise<Property[]> {
        return this.model.dao.listProperties(propertyId);
    }

    /**
     * Create new classes for a given dimension.
     * @param {String} thingId
     * @param {String} propertyId
     * @param {Class[]} classes
     **/
    createClasses(thingId, propertyId, classes): Promise<Class[]> {
        return this.read(thingId, propertyId)
            .then(property => {
                if (property.type === 'CLASS') {
                    // Fetch the existing classes to know the attributed values
                    return this.model.dao.listPropertyClasses(propertyId);
                } else {
                    return Promise.reject({ msg: 'Property must be of type CLASS.' });
                }
            })
            .then(existingClasses => {
                // By default, the first attributed value is 0
                let value = 0;
                existingClasses.forEach(clazz => {
                    // Our next value need to be greater than all existing ones
                    if (clazz.value >= value) value = clazz.value + 1;
                });

                classes.forEach(clazz => {
                    clazz.value = value;
                    clazz.propertyId = propertyId;
                    value++;
                });
                return this.model.dao.insertClasses(propertyId, classes);
            })
            .then(() => {
                return Promise.resolve(classes);
            })
            .catch(error => {
                return Promise.reject(error);
            });
    }

    /**
     * Delete a property
     * @param propertyId
     * @return {Promise}
     */
    del(propertyId): Promise<void> {
        return this.model.dao.deleteProperty(propertyId);
    }

    /**
     * Send Property to Kafka.
     * @param {Property} property
     */
    toKafka(property): Promise<void> {
        return this.model.kafka.pushData('properties', [property], property.id);
    }

    /**
     * Send values to Kafka.
     * @param {Property} property
     */
    valuesToKafka(property): Promise<void> {
        const key = `${property.entityId}_${property.id}`;
        return this.model.kafka.pushData('values', [property], key);
    }
}
