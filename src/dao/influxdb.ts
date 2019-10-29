'use strict';

// Setting the logs
import log4js = require('log4js');
const logger = log4js.getLogger('[lib:influx]');
logger.level = process.env.LOG_LEVEL || 'INFO';

import { InfluxDB, IPoint, FieldType } from 'influx';
import { Property } from '../entities/Property';

const propertyMap = {};

export class Influx {
    influx: InfluxDB;
    host: string;
    dbName: string;
    /**
     * @param {String} host         Host of InfluxDB server
     * @param {String} database     Name of the database
     */
    constructor(host, database) {
        this.host = host;
        this.dbName = database;
        this.influx = new InfluxDB({
            host: host,
            database: database,
            schema: schema,
        });
    }

    /**
     * Create the Influx database
     * @return {Promise<any>}
     */
    createStore() {
        logger.debug('create store');
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
            propertyMap[entityId + '_' + property.id] = property;
        });
        return this.influx.writePoints(propertiesToPoints(properties));
    }

    /**
     * @param {Property} property
     */
    createValues(property) {
        if (property.values.length > 0) {
            const points = valuesToPoints(property);
            return this.influx.writePoints(points, {
                precision: 'ms',
                database: this.dbName,
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
     * @return {Promise<Property>}
     */
    readPropertyValues(
        property: Property,
        from: number = undefined,
        to: number = undefined,
        timeInterval: number = undefined,
        fctInterval = 'MEAN',
        fill = 'none',
    ): Promise<Property> {
        let query = `SELECT time`;
        for (const index in property.dimensions) {
            if (timeInterval !== undefined) {
                query += `, ${fctInterval}(${property.dimensions[index].name})`;
            } else {
                query += `, ${property.dimensions[index].name} `;
            }
        }
        query += ` FROM "${property.type}"`;

        if (from !== undefined && to !== undefined) {
            const start = new Date(from).toISOString();
            const end = new Date(to).toISOString();
            query += ` WHERE time >= '${start}' AND time <= '${end}' AND "entity_id" = '${property.entityId}' AND "property_id" = '${property.id}'`;
        }

        if (timeInterval !== undefined) {
            query += ` GROUP BY time(${timeInterval}) fill(${fill})`;
        }

        return this.influx
            .queryRaw(query, {
                precision: 'ms',
                database: this.dbName,
            })
            .then(data => {
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
function thingsToPoints(things): IPoint[] {
    const points = [];
    things.forEach(thing => {
        const point = {
            measurement: 'thing',
            tags: {},
            fields: {
                id: thing.id,
                name: thing.name,
                description: thing.description,
                type: thing.type,
            },
        };
        points.push(point);
    });
    return points;
}

/**
 * @param {Property[]} properties
 * @returns {Array}
 */
function propertiesToPoints(properties): IPoint[] {
    const points = [];
    properties.forEach(property => {
        const point = {
            measurement: 'property',
            tags: {},
            fields: {
                id: property.id,
                name: property.name,
                description: property.description,
                type: property.type,
                entityId: property.entityId,
            },
        };
        points.push(point);
    });
    return points;
}

/**
 * @param {Property} property
 * @returns {IPoint[]}
 */
function valuesToPoints(property): IPoint[] {
    let ts;
    const points = [];
    const dimensions = property.dimensions;
    for (let index = 0; index < property.values.length; index++) {
        if (property.values[index] !== undefined) {
            const values = property.values[index];
            if (values.length - 1 === dimensions.length || values.length === dimensions.length) {
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
                        property_id: property.id,
                    },
                    fields: fields,
                    timestamp: ts,
                });
            }
        }
    }
    return points;
}

const schema = [
    {
        measurement: 'person',
        fields: {
            id: FieldType.STRING,
            name: FieldType.STRING,
        },
        tags: [],
    },
    {
        measurement: 'thing',
        fields: {
            id: FieldType.STRING,
            name: FieldType.STRING,
            description: FieldType.STRING,
            type: FieldType.STRING,
        },
        tags: ['person_id'],
    },
    {
        measurement: 'property',
        fields: {
            id: FieldType.STRING,
            name: FieldType.STRING,
            description: FieldType.STRING,
            type: FieldType.STRING,
            entityId: FieldType.STRING,
        },
        tags: ['entity_id'],
    },
    {
        measurement: 'TEXT',
        fields: {
            Value1: FieldType.STRING,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'ACCELEROMETER',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
            z: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'GYROSCOPE',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
            z: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'BINARY',
        fields: {
            Binary: FieldType.BOOLEAN,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'MAGNETIC_FIELD',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
            z: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'GRAVITY',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
            z: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'ROTATION_VECTOR',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
            z: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'EULER_ANGLE',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
            z: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'LIGHT',
        fields: {
            Illuminance: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'LOCATION',
        fields: {
            Longitude: FieldType.FLOAT,
            Latitude: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'ALTITUDE',
        fields: {
            Altitude: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'BEARING',
        fields: {
            Bearing: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'SPEED',
        fields: {
            Speed: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'PRESSURE',
        fields: {
            Pressure: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'PROXIMITY',
        fields: {
            Proximity: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'RELATIVE_HUMIDITY',
        fields: {
            'Relative humidity': FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'COUNT',
        fields: {
            Count: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'FORCE',
        fields: {
            Force: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'TEMPERATURE',
        fields: {
            Temperature: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'State',
        fields: {
            State: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'CLASS',
        fields: {
            Class: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'VIDEO',
        fields: {
            Duration: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'AUDIO',
        fields: {
            Duration: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'PICTURE',
        fields: {
            x: FieldType.FLOAT,
            y: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'HEART_RATE',
        fields: {
            'Hear rate': FieldType.FLOAT,
            'RR-Interval': FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'WIFI',
        fields: {
            'Session Duration': FieldType.FLOAT,
            RSSI: FieldType.FLOAT,
            SNR: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'ONE_DIMENSION',
        fields: {
            Value1: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'TWO_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'THREE_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'FOUR_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'FIVE_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'SIX_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'SEVEN_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'EIGHT_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'NINE_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'TEN_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
            Value10: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'ELEVEN_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
            Value10: FieldType.FLOAT,
            Value11: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'TWELVE_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
            Value10: FieldType.FLOAT,
            Value11: FieldType.FLOAT,
            Value12: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'THIRTEEN_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
            Value10: FieldType.FLOAT,
            Value11: FieldType.FLOAT,
            Value12: FieldType.FLOAT,
            Value13: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'FOURTEEN_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
            Value10: FieldType.FLOAT,
            Value11: FieldType.FLOAT,
            Value12: FieldType.FLOAT,
            Value13: FieldType.FLOAT,
            Value14: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
    {
        measurement: 'FIFTEEN_DIMENSIONS',
        fields: {
            Value1: FieldType.FLOAT,
            Value2: FieldType.FLOAT,
            Value3: FieldType.FLOAT,
            Value4: FieldType.FLOAT,
            Value5: FieldType.FLOAT,
            Value6: FieldType.FLOAT,
            Value7: FieldType.FLOAT,
            Value8: FieldType.FLOAT,
            Value9: FieldType.FLOAT,
            Value10: FieldType.FLOAT,
            Value11: FieldType.FLOAT,
            Value12: FieldType.FLOAT,
            Value13: FieldType.FLOAT,
            Value14: FieldType.FLOAT,
            Value15: FieldType.FLOAT,
        },
        tags: ['entity_id', 'property_id'],
    },
];
