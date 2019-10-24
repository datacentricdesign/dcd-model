"use strict";

import { uuidv4 } from "../lib/id";
import { Property, IProperty } from "./Property";

export class Interaction {
  id: any;
  entityId1: any;
  entityId2: any;
  properties: any[];
  type: string;
  readAt: number;
  /**
   * @param {string|JSON} type
   * @param entityId1
   * @param entityId2
   * @param properties
   * @param id
   */
  constructor(
    type: string | IInteraction = "",
    entityId1: string,
    entityId2: string,
    properties: Property[] = [],
    id: string
  ) {
    if (type instanceof IInteraction) {
      const interaction = type;
      this.id = interaction.id;
      this.entityId1 =
        interaction.entity_id_1 !== undefined ? interaction.entity_id_1 : "";
      this.entityId2 =
        interaction.entity_id_2 !== undefined ? interaction.entity_id_2 : "";
      this.properties =
        interaction.properties !== undefined ? interaction.properties : [];
    } else {
      this.id = id !== undefined ? id : uuidv4();
      this.type = type;
      this.entityId1 = entityId1;
      this.entityId2 = entityId2;
      this.properties = properties;
    }
    this.readAt = Date.now();
  }
}

export interface IInteraction {
  id: string;
  entity_id_1: string;
  entity_id_2: string;
  properties: IProperties[];
}
