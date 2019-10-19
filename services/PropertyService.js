"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:properties]");
logger.level = process.env.LOG_LEVEL || "INFO";

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
   * @param {int} interval
   * @param {string} fill
   * @return {Promise<Property>}
   */
  read(
    entityId,
    propertyId,
    from = undefined,
    to = undefined,
    interval = undefined,
    fill = "none"
  ) {
    return this.model.dao
      .readProperty(entityId, propertyId)
      .then(property => {
        if (from !== undefined && to !== undefined) {
          // return this.model.dao.readPropertyValues(property, from, to);
          return this.model.influx.readPropertyValues(
            property,
            from,
            to,
            interval,
            fill
          );
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
  update(property) {
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
  updateValues(property) {
    if (property.values === undefined || property.values.length === 0) {
      return Promise.resolve();
    }

    return this.model.dao
      .updatePropertyValues(property)
      .then(report => {
        // Publish the property values to kafka
        return this.valuesToKafka(property.values, property.id).then(() => {
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
  list(propertyId) {
    return this.model.dao.listProperties(propertyId);
  }

  /**
   * Create new classes for a given dimension.
   * @param {String} thingId
   * @param {String} propertyId
   * @param {Class[]} classes
   **/
  createClasses(thingId, propertyId, classes) {
    return this.read(thingId, propertyId)
      .then(property => {
        if (property.type === "CLASS") {
          // Fetch the existing classes to know the attributed values
          return this.model.dao.listPropertyClasses(propertyId);
        } else {
          return Promise.reject({ msg: "Property must be of type CLASS." });
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
  del(propertyId) {
    return this.model.dao.deleteProperty(propertyId);
  }

  /**
   * Send Property to Kafka.
   * @param {Property} property
   */
  toKafka(property) {
    return this.model.kafka.pushData("properties", [property], property.id);
  }

  /**
   * Send values to Kafka.
   * @param {Array} values
   * @param {String} key - thingId-propertyId
   */
  valuesToKafka(values, key) {
    return this.model.kafka.pushData("values", values, key);
  }
}

module.exports = PropertyService;
