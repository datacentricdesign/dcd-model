'use strict';

const idGen = require('../lib/id');

class Property {

    /**
     *
     * @param {String|Object} name
     * @param description
     * @param type
     * @param dimensions
     * @param id
     */
    constructor(name = '', description = '', type = undefined, dimensions = [], id) {
        if (typeof name === 'object') {
            const property = name;

            this.id = property.id !== undefined
                ? property.id : idGen.toID(property.name);

            if (property.type !== undefined) {
                this.enrichType(property.type);
            }

            if (property.name !== undefined) {
                this.name = property.name;
            } else if (this.name === undefined) {
                this.name = '';
            }

            if (property.description !== undefined) {
                this.description = property.description;
            } else if (this.description === undefined) {
                this.description = '';
            }

            if (property.dimensions !== undefined) {
                this.dimensions = property.dimensions;
            } else if (this.dimensions === undefined) {
                this.dimensions = [];
            }

            this.values = property.values !== undefined
                ? property.values : [];
            this.entityId = property.entityId !== undefined
                ? property.entityId : null;
        } else {
            this.enrichType(type);
            this.id = id !== undefined ? id : idGen.toID(name);
            if (this.name === undefined || name !== '') {
                this.name = name;
            }

            if (this.description === undefined || description !== '') {
                this.description = description;
            }

            if (this.dimensions === undefined || dimensions.length > 0) {
                this.dimensions = dimensions;
            }

            this.values = [];
            this.entityId = null;
        }

        this.readAt = Date.now();
    }

    /**
     * Look up in predefined Types if it is a known type
     * and fill in name, description and dimensions.
     * @param typeName
     */
    enrichType(typeName) {
        if (typeName !== undefined) {
            this.type = typeName;
            if (Types.hasOwnProperty(typeName)) {
                const type = Types[typeName];
                this.name = type.name;
                this.description = type.desc;
                this.dimensions = JSON.parse(JSON.stringify(type.dimensions));
            }
        } else {
            this.type = '';
        }
    }

    /**
     * @param {Array[]} values
     */
    addValues(values) {
        this.values = this.values.concat(values);
    }

    /**
     * @param {Dimension} dimension
     */
    addDimension(dimension) {
        this.dimensions.push(dimension);
    }

    static types() {
        return JSON.parse(JSON.stringify(Types));
    }

}

const Types = {
    ACCELEROMETER: {
        name: 'Accelerometer',
        description: 'Acceleration force that is applied to a device on all three physical axes x, y and z, including the force of gravity.',
        dimensions: [
            {
                name: 'x',
                description: 'Acceleration force that is applied to a device on physical axe x, including the force of gravity.',
                unit: 'm/s2'
            },
            {
                name: 'y',
                description: 'Acceleration force that is applied to a device on physical axe y, including the force of gravity.',
                unit: 'm/s2'
            },
            {
                name: 'z',
                description: 'Acceleration force that is applied to a device on physical axe z, including the force of gravity.',
                unit: 'm/s2'
            },
        ]
    },
    GYROSCOPE: {
        name: 'Gyroscope',
        description: 'Rate of rotation around the three axis x, y and z.',
        dimensions: [
            {
                name: 'x',
                description: 'Rate of rotation around the x axis.',
                unit: 'rad/s'
            },
            {
                name: 'y',
                description: 'Rate of rotation around the y axis.',
                unit: 'rad/s'
            },
            {
                name: 'z',
                description: 'Rate of rotation around the z axis.',
                unit: 'rad/s'
            },
        ]
    },
    BINARY: {
        name: 'Binary',
        description: 'Can take value 0 or 1.',
        dimensions: [{name: 'state', description: 'Binary State', unit: ''}]
    },
    MAGNETIC_FIELD: {
        name: 'Magnetic Field',
        description: 'Geomagnetic field strength along the x, y and z axis.',
        dimensions: [
            {
                name: 'x',
                description: 'Geomagnetic field strength along the x axis.',
                unit: 'uT'
            },
            {
                name: 'y',
                description: 'Geomagnetic field strength along the y axis.',
                unit: 'uT'
            },
            {
                name: 'z',
                description: 'Geomagnetic field strength along the z axis.',
                unit: 'uT'
            },
        ]
    },
    GRAVITY: {
        name: 'Gravity',
        description: 'Force of gravity along x, y and z axis.',
        dimensions: [
            {
                name: 'x',
                description: 'Force of gravity along the x axis.',
                unit: 'm/s2'
            },
            {
                name: 'y',
                description: 'Force of gravity along the y axis.',
                unit: 'm/s2'
            },
            {
                name: 'z',
                description: 'Force of gravity along the z axis.',
                unit: 'm/s2'
            },
        ]
    },
    ROTATION_VECTOR: {
        name: 'Rotation Vector',
        description: '',
        dimensions: [
            {
                name: 'x',
                description: 'Rotation vector component along the x axis (x * sin(theta/2)).',
                unit: ''
            },
            {
                name: 'y',
                description: 'Rotation vector component along the y axis (y * sin(theta/2)).',
                unit: ''
            },
            {
                name: 'z',
                description: 'Rotation vector component along the z axis (z * sin(theta/2)).',
                unit: ''
            },
        ]
    },
    LIGHT: {
        name: 'Light',
        description: 'Light level',
        dimensions: [
            {
                name: 'Illuminance',
                description: '',
                unit: 'lx'
            }
        ]
    },
    LOCATION: {
        name: 'Location',
        description: 'Longitude and latitude in degrees',
        dimensions: [
            {
                name: 'Longitude',
                description: '',
                unit: '°'
            },
            {
                name: 'Latitude',
                description: '',
                unit: '°'
            }
        ]
    },
    ALTITUDE: {
        name: 'Altitude',
        description: 'Altitude in meters above the WGS 84 reference ellipsoid.',
        dimensions: [
            {
                name: 'Altitude',
                description: '',
                unit: 'm'
            }
        ]
    },
    BEARING: {
        name: 'Bearing',
        description: 'Bearing in degrees',
        dimensions: [
            {
                name: 'Bearing',
                description: '',
                unit: '°'
            }
        ]
    },
    SPEED: {
        name: 'Speed',
        description: '',
        dimensions: [
            {
                name: 'Speed',
                description: '',
                unit: ''
            }
        ]
    },
    PRESSURE: {
        name: 'Pressure',
        description: 'Atmospheric pressure in hPa (millibar)',
        dimensions: [
            {
                name: 'Pressure',
                description: '',
                unit: 'hPa'
            }
        ]
    },
    PROXIMITY: {
        name: 'Proximity',
        description: 'Proximity from object (binary or in cm)',
        dimensions: [
            {
                name: 'Proximity',
                description: '',
                unit: 'cm'
            }
        ]
    },
    RELATIVE_HUMIDITY: {
        name: 'Relative Humidity',
        description: 'Relative ambient air humidity in percent',
        dimensions: [
            {
                name: 'Relative Humidity',
                description: '',
                unit: 'H%'
            }
        ]
    },
    COUNT: {
        name: 'Count',
        description: '',
        dimensions: [
            {
                name: 'Count',
                description: '',
                unit: ''
            }
        ]
    },
    FORCE: {
        name: 'Force',
        description: '',
        dimensions: [
            {
                name: 'Force',
                description: '',
                unit: 'kg'
            }
        ]
    },
    TEMPERATURE: {
        name: 'Temperature',
        description: '',
        dimensions: [
            {
                name: 'Temperature',
                description: '',
                unit: '°C'
            }
        ]
    },
    STATE: {
        name: 'State',
        description: '',
        dimensions: [
            {
                name: 'Value',
                description: '',
                unit: ''
            }
        ]
    },
    ONE_DIMENSION: {
        name: '1 Dimension',
        description: '',
        dimensions: [
            {
                name: 'Value',
                description: '',
                unit: ''
            }
        ]
    },
    TWO_DIMENSIONS: {
        name: '2 Dimensions',
        description: '',
        dimensions: [
            {
                name: 'Value1',
                description: '',
                unit: ''
            },
            {
                name: 'Value2',
                description: '',
                unit: ''
            }
        ]
    },
    THREE_DIMENSIONS: {
        name: '3 Dimension',
        description: '',
        dimensions: [
            {
                name: 'Value1',
                description: '',
                unit: ''
            },
            {
                name: 'Value2',
                description: '',
                unit: ''
            },
            {
                name: 'Value3',
                description: '',
                unit: ''
            }
        ]
    }
};

module.exports = Property;