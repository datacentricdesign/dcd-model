"use strict";

class Dimension {
  /**
   * @constructor
   */
  constructor(name, description, unit) {
    this.name = name !== undefined ? name : "";
    this.description = description !== undefined ? description : "";
    this.unit = unit !== undefined ? unit : "";
  }
}

module.exports = Dimension;
