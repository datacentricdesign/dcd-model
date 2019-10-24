"use strict";

const idGen = require("../lib/id");
const DCDError = require("../lib/Error");

/**
 * A Thing represents a physical or virtual component collecting data.
 * For example, a phone which collects acceleration, a website recording
 * number of page views.
 */
class Thing {
  /**
   * @constructor
   * @param {string|object} name The Thing as JSON object or the Thing name
   * @param {string} description The Thing description
   * @param {string} type The Thing Type
   * @param {Array<Property>} properties
   * @param {string} id A unique identifier, automatically generated if missing.
   */
  constructor(name = "", description = "", type = "", properties = [], id) {
    if (typeof name === "object") {
      const thing = name;
      this.id = thing.id !== undefined ? thing.id : idGen.toID(thing.name);
      this.name = thing.name !== undefined ? thing.name : "";
      this.description =
        thing.description !== undefined ? thing.description : "";
      this.type = thing.type !== undefined ? thing.type : "";
      this.properties = thing.properties !== undefined ? thing.properties : [];
      if (thing.registered_at !== undefined) {
        this.registeredAt = thing.registered_at;
      }
      if (thing.pem !== undefined) {
        this.pem = thing.pem;
      }
    } else {
      this.id = id !== undefined ? id : idGen.toID(name);
      this.name = name;
      this.description = description;
      this.type = type;
      this.properties = properties;
    }

    if (!this.id.startsWith("dcd:things:")) {
      this.id = "dcd:things:" + this.id;
    }

    this.readAt = Date.now();
    this.keys = {};
  }

  findPropertyByName(name) {
    for (let key in this.properties) {
      const property = this.properties[key];
      if (property.name === name) {
        return property;
      }
    }
    throw new DCDError(404, "Property with name " + name + " not found");
  }
}

module.exports = Thing;
