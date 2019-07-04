"use strict";

const idGen = require("../lib/id");

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
    this.properties.forEach( (property) => {
      if (property.name === name) {
        return property;
      }
    });
    throw Exception(new Error('Property not found'));
  }

}

module.exports = Thing;
