"use strict";

const idGen = require("../lib/id");
const DCDError = require("../lib/Error");

class Thing {
  /**
   *
   * @param {String|object} name
   * @param description
   * @param type
   * @param properties
   * @param id
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
    } else {
      this.id = id !== undefined ? id : idGen.toID(name);
      this.name = name;
      this.description = description;
      this.type = type;
      this.properties = properties;
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
