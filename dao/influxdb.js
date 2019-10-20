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
          measurement: "person",
          fields: {
            id: Influx.FieldType.STRING,
            name: Influx.FieldType.STRING,
          },
          tags: []
        },
        {
          measurement: "thing",
          fields: {
            id: Influx.FieldType.STRING,
            name: Influx.FieldType.STRING,
            description: Influx.FieldType.STRING,
            type: Influx.FieldType.STRING
          },
          tags: ["person_id"]
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
          tags: ["entity_id"]
        },
        {
          measurement: "THREE_DIMENSIONS",
          fields: {
            Value1: Influx.FieldType.FLOAT,
            Value2: Influx.FieldType.FLOAT,
            Value3: Influx.FieldType.FLOAT
          },
          tags: ["entity_id", "property_id"]
        }
      ]
    });
  }

  /**
   * Create the Influx database
   * @return {Promise<any>}
   */
  createStore() {
    logger.debug("create store");
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
   * @param {Property} property
   */
  createValues(property) {
    if (property.values.length > 0) {
      const points = valuesToPoints(property);
      logger.debug(points);
      return this.influx.writePoints(points, {
        precision: "ms",
        database: this.dbName
      });
    }
  }

  /**
   *
   * @param {Property} property
   * @param {int} from
   * @param {int} to
   * @param {string} timeInterval
   * @param {string} fctInterval
   * @param {string} fill
   * @return {Promise<any>}
   */
  readPropertyValues(
    property,
    from = undefined,
    to = undefined,
    timeInterval = undefined,
    fctInterval = "MEAN",
    fill = "none"
  ) {
    logger.debug("read prop values");
    let query = `SELECT time`;
    for (let index in property.dimensions) {
      if (timeInterval !== undefined) {
        query += `, ${fctInterval}(${property.dimensions[index].name})`;
      } else {
        query += `, ${property.dimensions[index].name} `;
      }
    }
    query += ` FROM "${property.type}"`;

    if (from !== undefined && to !== undefined) {
      const start = new Date(from).toISOString();
      const end = new Date(to + 100000).toISOString();
      query += ` WHERE "entity_id" = '${property.entityId}' AND "property_id" = '${property.id}'`;
    }

    if (timeInterval !== undefined) {
      query += ` GROUP BY time(${timeInterval}) fill(${fill})`;
    }

    logger.debug(query);

    return this.influx
      .queryRaw(query, {
        precision: "ms",
        database: this.dbName
      })
      .then(data => {
        logger.debug(data);
        if (
          data.results.length > 0 &&
          data.results[0].series !== undefined &&
          data.results[0].series.length > 0
        ) {
          property.values = data.results[0].series[0].values;
        } else {
          property.values = [];
        }
        return Promise.resolve(property);
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
 * @param {Property} property
 * @returns {IPoint[]}
 */
function valuesToPoints(property) {
  let ts;
  const points = [];
  const dimensions = property.dimensions;
  for (let key in property.values) {
    const values = property.values[key];
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
      points.push({
        measurement: property.type,
        tags: {
          entity_id: property.entityId,
          property_id: property.id
        },
        fields: fields,
        timestamp: ts
      });
    }
  }
  return points;
}

module.exports = InfluxDB;
