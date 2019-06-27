"use strict";

const idGen = require("../lib/id");

class Interaction {
  /**
   * @param type
   * @param entityId1
   * @param entityId2
   * @param properties
   * @param id
   */
  constructor(type = "", entityId1, entityId2, properties = [], id) {
    if (typeof type === "object") {
      const interaction = type;
      this.id = interaction.id !== undefined ? interaction.id : idGen.uuidv4();
      this.entityId1 =
        interaction.entityId1 !== undefined ? interaction.entityId1 : "";
      this.entityId2 =
        interaction.entityId2 !== undefined ? interaction.entityId2 : "";
      this.properties =
        interaction.properties !== undefined ? interaction.properties : [];
    } else {
      this.id = id !== undefined ? id : idGen.uuidv4();
      this.type = type;
      this.entityId1 = entityId1;
      this.entityId2 = entityId2;
      this.properties = properties;
    }
    this.readAt = Date.now();
  }
}

module.exports = Interaction;