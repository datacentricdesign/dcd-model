"use strict";

const idGen = require("../lib/id");

class Property {
  /**
   *
   * @param {string|Object} name
   * @param {string} description
   * @param {string} type
   * @param {Dimension[]} dimensions
   * @param {Classes[]} classes
   * @param {string} id
   */
  constructor(
    name = "",
    description = "",
    type = undefined,
    dimensions = [],
    classes = [],
    id
  ) {
    if (typeof name === "object") {
      const property = name;

      if (
        property.type !== undefined &&
        (property.dimensions === undefined || property.dimensions.length === 0)
      ) {
        this.enrichType(property.type);
      }
      this.type = property.type;

      if (property.name !== undefined) {
        this.name = property.name;
      } else if (this.name === undefined) {
        this.name = "";
      }

      this.id = property.id !== undefined ? property.id : idGen.toID(this.name);

      if (property.description !== undefined) {
        this.description = property.description;
      } else if (this.description === undefined) {
        this.description = "";
      }

      if (property.dimensions !== undefined) {
        this.dimensions = property.dimensions;
      } else if (this.dimensions === undefined) {
        this.dimensions = [];
      }

      if (property.classes !== undefined) {
        this.classes = property.classes;
      } else if (this.classes === undefined) {
        this.classes = [];
      }

      this.values = property.values !== undefined ? property.values : [];
      this.entityId =
        property.entityId !== undefined ? property.entityId : null;
    } else {
      if (dimensions.length === 0) {
        this.enrichType(type);
      }
      this.type = type;
      this.id = id !== undefined ? id : idGen.toID(name);
      if (this.name === undefined || name !== "") {
        this.name = name;
      }

      if (this.description === undefined || description !== "") {
        this.description = description;
      }

      if (this.dimensions === undefined || dimensions.length > 0) {
        this.dimensions = dimensions;
      }

      if (this.classes === undefined || classes.length > 0) {
        this.classes = classes;
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
      this.type = "";
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

  /**
   * @param {Class} clazz
   */
  addClass(clazz) {
    this.classes.push(clazz);
  }

  static types() {
    return JSON.parse(JSON.stringify(Types));
  }
}

const Types = {
  TEXT: {
    name: "Text",
    description: "",
    dimensions: [
      {
        name: "Text",
        description: "",
        unit: ""
      }
    ]
  },
  ACCELEROMETER: {
    name: "Accelerometer",
    description:
      "Acceleration force that is applied to a device on all three physical axes x, y and z, including the force of gravity.",
    dimensions: [
      {
        name: "x",
        description:
          "Acceleration force that is applied to a device on physical axe x, including the force of gravity.",
        unit: "m/s2"
      },
      {
        name: "y",
        description:
          "Acceleration force that is applied to a device on physical axe y, including the force of gravity.",
        unit: "m/s2"
      },
      {
        name: "z",
        description:
          "Acceleration force that is applied to a device on physical axe z, including the force of gravity.",
        unit: "m/s2"
      }
    ]
  },
  GYROSCOPE: {
    name: "Gyroscope",
    description: "Rate of rotation around the three axis x, y and z.",
    dimensions: [
      {
        name: "x",
        description: "Rate of rotation around the x axis.",
        unit: "rad/s"
      },
      {
        name: "y",
        description: "Rate of rotation around the y axis.",
        unit: "rad/s"
      },
      {
        name: "z",
        description: "Rate of rotation around the z axis.",
        unit: "rad/s"
      }
    ]
  },
  BINARY: {
    name: "Binary",
    description: "Can take value 0 or 1.",
    dimensions: [{ name: "state", description: "Binary State", unit: "" }]
  },
  MAGNETIC_FIELD: {
    name: "Magnetic Field",
    description: "Geomagnetic field strength along the x, y and z axis.",
    dimensions: [
      {
        name: "x",
        description: "Geomagnetic field strength along the x axis.",
        unit: "uT"
      },
      {
        name: "y",
        description: "Geomagnetic field strength along the y axis.",
        unit: "uT"
      },
      {
        name: "z",
        description: "Geomagnetic field strength along the z axis.",
        unit: "uT"
      }
    ]
  },
  GRAVITY: {
    name: "Gravity",
    description: "Force of gravity along x, y and z axis.",
    dimensions: [
      {
        name: "x",
        description: "Force of gravity along the x axis.",
        unit: "m/s2"
      },
      {
        name: "y",
        description: "Force of gravity along the y axis.",
        unit: "m/s2"
      },
      {
        name: "z",
        description: "Force of gravity along the z axis.",
        unit: "m/s2"
      }
    ]
  },
  ROTATION_VECTOR: {
    name: "Rotation Vector",
    description: "",
    dimensions: [
      {
        name: "x",
        description:
          "Rotation vector component along the x axis (x * sin(theta/2)).",
        unit: ""
      },
      {
        name: "y",
        description:
          "Rotation vector component along the y axis (y * sin(theta/2)).",
        unit: ""
      },
      {
        name: "z",
        description:
          "Rotation vector component along the z axis (z * sin(theta/2)).",
        unit: ""
      }
    ]
  },
  LIGHT: {
    name: "Light",
    description: "Light level",
    dimensions: [
      {
        name: "Illuminance",
        description: "",
        unit: "lx"
      }
    ]
  },
  LOCATION: {
    name: "Location",
    description: "Longitude and latitude in degrees",
    dimensions: [
      {
        name: "Longitude",
        description: "",
        unit: "°"
      },
      {
        name: "Latitude",
        description: "",
        unit: "°"
      }
    ]
  },
  ALTITUDE: {
    name: "Altitude",
    description: "Altitude in meters above the WGS 84 reference ellipsoid.",
    dimensions: [
      {
        name: "Altitude",
        description: "",
        unit: "m"
      }
    ]
  },
  BEARING: {
    name: "Bearing",
    description: "Bearing in degrees",
    dimensions: [
      {
        name: "Bearing",
        description: "",
        unit: "°"
      }
    ]
  },
  SPEED: {
    name: "Speed",
    description: "",
    dimensions: [
      {
        name: "Speed",
        description: "",
        unit: ""
      }
    ]
  },
  PRESSURE: {
    name: "Pressure",
    description: "Atmospheric pressure in hPa (millibar)",
    dimensions: [
      {
        name: "Pressure",
        description: "",
        unit: "hPa"
      }
    ]
  },
  PROXIMITY: {
    name: "Proximity",
    description: "Proximity from object (binary or in cm)",
    dimensions: [
      {
        name: "Proximity",
        description: "",
        unit: "cm"
      }
    ]
  },
  RELATIVE_HUMIDITY: {
    name: "Relative Humidity",
    description: "Relative ambient air humidity in percent",
    dimensions: [
      {
        name: "Relative Humidity",
        description: "",
        unit: "H%"
      }
    ]
  },
  COUNT: {
    name: "Count",
    description: "",
    dimensions: [
      {
        name: "Count",
        description: "",
        unit: ""
      }
    ]
  },
  FORCE: {
    name: "Force",
    description: "",
    dimensions: [
      {
        name: "Force",
        description: "",
        unit: "kg"
      }
    ]
  },
  TEMPERATURE: {
    name: "Temperature",
    description: "",
    dimensions: [
      {
        name: "Temperature",
        description: "",
        unit: "°C"
      }
    ]
  },
  STATE: {
    name: "State",
    description: "",
    dimensions: [
      {
        name: "Value",
        description: "",
        unit: ""
      }
    ]
  },
  CLASS: {
    name: "Class",
    description: "",
    dimensions: [
      {
        name: "Class",
        description:
          "Values of this dimension represents the classes of the property",
        unit: ""
      }
    ]
  },
  VIDEO: {
    name: "Video",
    description: "",
    dimensions: [
      {
        name: "Duration",
        description: "Duration of the video record.",
        unit: "ms"
      }
    ]
  },
  HEART_RATE: {
    name: "Heart Rate",
    description: "Heart Rate Measurement (HRM)",
    dimensions: [
      {
        name: "Heart Rate",
        description: "Heart rate in beats per minutes",
        unit: "BPM"
      },
      {
        name: "RR-Interval",
        description: "RR-Interval in seconds",
        unit: "s"
      }
    ]
  },
  WIFI: {
    name: "WiFi",
    description: "WiFi interaction",
    dimensions: [
      {
        name: "Session duration",
        description: "Session duration",
        unit: "ms"
      },
      {
        name: "RSSI",
        description: "Received Signal Strength Indicator",
        unit: ""
      },
      {
        name: "SNR",
        description: "Signal-to-Noise Ratio",
        unit: ""
      }
    ]
  },
  ONE_DIMENSION: {
    name: "1 Dimension",
    description: "",
    dimensions: [
      {
        name: "Value",
        description: "",
        unit: ""
      }
    ]
  },
  TWO_DIMENSIONS: {
    name: "2 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      }
    ]
  },
  THREE_DIMENSIONS: {
    name: "3 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      }
    ]
  },
  FOUR_DIMENSIONS: {
    name: "4 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      }
    ]
  },
  FIVE_DIMENSIONS: {
    name: "5 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      },
      {
        name: "Value5",
        description: "",
        unit: ""
      }
    ]
  },
  SIX_DIMENSIONS: {
    name: "6 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      },
      {
        name: "Value5",
        description: "",
        unit: ""
      },
      {
        name: "Value6",
        description: "",
        unit: ""
      }
    ]
  },
  NINE_DIMENSIONS: {
    name: "9 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      },
      {
        name: "Value5",
        description: "",
        unit: ""
      },
      {
        name: "Value6",
        description: "",
        unit: ""
      },
      {
        name: "Value7",
        description: "",
        unit: ""
      },
      {
        name: "Value8",
        description: "",
        unit: ""
      },
      {
        name: "Value9",
        description: "",
        unit: ""
      }
    ]
  },
  TEN_DIMENSIONS: {
    name: "10 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      },
      {
        name: "Value5",
        description: "",
        unit: ""
      },
      {
        name: "Value6",
        description: "",
        unit: ""
      },
      {
        name: "Value7",
        description: "",
        unit: ""
      },
      {
        name: "Value8",
        description: "",
        unit: ""
      },
      {
        name: "Value9",
        description: "",
        unit: ""
      },
      {
        name: "Value10",
        description: "",
        unit: ""
      }
    ]
  },
  ELEVEN_DIMENSIONS: {
    name: "11 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      },
      {
        name: "Value5",
        description: "",
        unit: ""
      },
      {
        name: "Value6",
        description: "",
        unit: ""
      },
      {
        name: "Value7",
        description: "",
        unit: ""
      },
      {
        name: "Value8",
        description: "",
        unit: ""
      },
      {
        name: "Value9",
        description: "",
        unit: ""
      },
      {
        name: "Value10",
        description: "",
        unit: ""
      },
      {
        name: "Value11",
        description: "",
        unit: ""
      }
    ]
  },
  TWELVE_DIMENSIONS: {
    name: "12 Dimensions",
    description: "",
    dimensions: [
      {
        name: "Value1",
        description: "",
        unit: ""
      },
      {
        name: "Value2",
        description: "",
        unit: ""
      },
      {
        name: "Value3",
        description: "",
        unit: ""
      },
      {
        name: "Value4",
        description: "",
        unit: ""
      },
      {
        name: "Value5",
        description: "",
        unit: ""
      },
      {
        name: "Value6",
        description: "",
        unit: ""
      },
      {
        name: "Value7",
        description: "",
        unit: ""
      },
      {
        name: "Value8",
        description: "",
        unit: ""
      },
      {
        name: "Value9",
        description: "",
        unit: ""
      },
      {
        name: "Value10",
        description: "",
        unit: ""
      },
      {
        name: "Value11",
        description: "",
        unit: ""
      },
      {
        name: "Value12",
        description: "",
        unit: ""
      }
    ]
  }
};

module.exports = Property;
