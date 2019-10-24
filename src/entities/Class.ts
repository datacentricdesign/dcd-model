"use strict";

export class Class {
  name: string;
  value: string;
  propertyId: string;
  description: string;

  /**
   * @constructor
   */
  constructor(name, value, propertyId, description = "") {
    if (typeof name === "object") {
      const json = name;
      this.name = json.name;
      this.value = json.value;
      this.propertyId = json.propertyId;
      this.description = json.description;
    } else {
      this.name = name;
      this.value = value;
      this.propertyId = propertyId;
      this.description = description;
    }
  }
}
