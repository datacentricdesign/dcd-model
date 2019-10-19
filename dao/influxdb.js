"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[lib:influx]");
logger.level = process.env.LOG_LEVEL || "INFO";

const Influx = require("influx");

const propertyMap = {};

class InfluxDB {
  /**
   * @param {String} host         Host of InfluxDB server
   * @param {String} database     Name of the database
   */
  constructor(host, database) {
    this.host = host;
    this.dbName = database;
    this.influx = new Influx.InfluxDB({
      host: host,
      database: database,
      schema: [
        {
          measurement: "thing",
          fields: {
            id: Influx.FieldType.STRING,
            name: Influx.FieldType.STRING,
            description: Influx.FieldType.STRING,
            type: Influx.FieldType.STRING
          },
          tags: ["user"]
        },
        {
          measurement: "property",
          fields: {
            id: Influx.FieldType.STRING,
            name: Influx.FieldType.STRING,
            description: Influx.FieldType.STRING,
            type: Influx.FieldType.STRING,
            entityId: Influx.FieldType.STRING
          },
          tags: ["user"]
        }
      ]
    });
  }

  /**
   * Create the Influx database
   * @return {Promise<any>}
   */
  createStore() {
    const query = `CREATE DATABASE ${this.dbName}`;
    return this.influx.queryRaw(query);
  }

  /**
   * Delete the Influx database
   * @return {Promise<any>}
   */
  deleteStore() {
    const query = `DROP DATABASE ${this.dbName}`;
    return this.influx.queryRaw(query);
  }

  /**
   * @param {Thing[]} things
   */
  createThings(things) {
    return this.influx.writePoints(thingsToPoints(things));
  }

  /**
   * @param {String} entityId
   * @param {Property[]} properties
   */
  createProperties(entityId, properties) {
    properties.forEach(property => {
      propertyMap[entityId + "_" + property.id] = property;
    });
    return this.influx.writePoints(propertiesToPoints(properties));
  }

  /**
   * @param {String} entityId
   * @param {String} propertyId
   * @param {number[]} values
   */
  createValues(entityId, propertyId, values) {
    return this.influx.writePoints(
      valuesToPoints(entityId, propertyId, values)
    );
  }

  /**
   *
   * @param {Property} property
   * @param {int} from
   * @param {int} to
   * @param {int} timeInterval millisecond group by interval
   * @param {string} fill
   * @return {Promise<any>}
   */
  readPropertyValues(
    property,
    from = undefined,
    to = undefined,
    timeInterval = undefined,
    fill = "none"
  ) {
    // TODO add ${property.entityId}_ in front of each measurement to avoid duplicates
    let query = `SELECT * FROM "${property.id}"`;

    if (from !== undefined && to !== undefined) {
      const start = new Date(from).toISOString();
      const end = new Date(to + 10000).toISOString();
      query += ` WHERE time >= '${start}' AND time <= '${end}'`;
    }

    if (timeInterval !== undefined) {
      query += `GROUP BY time(${timeInterval}) fill(${fill})`;
    }

    logger.debug(query);

    return this.influx.queryRaw(query, {
      precision: "ms",
      database: this.dbName
    });
  }
}

/**
 * @param {Thing[]} things
 * @returns {Array}
 */
function thingsToPoints(things) {
  const points = [];
  things.forEach(thing => {
    const point = {
      measurement: "thing",
      tags: {},
      fields: {
        id: thing.id,
        name: thing.name,
        description: thing.description,
        type: thing.type
      }
    };
    points.push(point);
  });
  return points;
}

/**
 * @param {Property[]} properties
 * @returns {Array}
 */
function propertiesToPoints(properties) {
  const points = [];
  properties.forEach(property => {
    const point = {
      measurement: "property",
      tags: {},
      fields: {
        id: property.id,
        name: property.name,
        description: property.description,
        type: property.type,
        entityId: property.entityId
      }
    };
    points.push(point);
  });
  return points;
}

/**
 * @param {String} entityId
 * @param {String} propertyId
 * @param {number[]} values
 * @returns {Point[]}
 */
function valuesToPoints(entityId, propertyId, values) {
  logger.debug(propertyMap);
  const points = [];
  const id = entityId + "_" + propertyId;
  if (propertyMap[id] !== undefined) {
    logger.debug(propertyMap[id].dimensions);
    logger.debug(values.length);
    const dimensions = propertyMap[id].dimensions;
    let ts;
    if (
      values.length - 1 === dimensions.length ||
      values.length === dimensions.length
    ) {
      if (values.length === dimensions.length) {
        // missing time, take from server
        ts = Date.now();
      } else {
        ts = values.shift();
      }
      const fields = {};
      for (let i = 0; i < values.length; i++) {
        const name = dimensions[i].name;
        fields[name] = values[i];
      }

      const point = {
        measurement: id,
        tags: {},
        fields: fields,
        time: ts
      };
      logger.debug(point);
      points.push(point);
    }
  }
  return points;
}

module.exports = InfluxDB;
