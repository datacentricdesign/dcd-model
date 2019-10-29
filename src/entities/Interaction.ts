'use strict';

import { uuidv4 } from '../lib/id';
import { Property, JSONProperty } from './Property';

export class Interaction {
    id: string;
    entityId1: string;
    entityId2: string;
    properties: Property[];
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
        type: string | JSONInteraction,
        entityId1: string,
        entityId2: string,
        properties: Property[] = [],
        id: string,
    ) {
        if (typeof type === 'object') {
            const interaction = type as JSONInteraction;
            this.id = interaction.id;
            this.entityId1 = interaction.entity_id_1 !== undefined ? interaction.entity_id_1 : '';
            this.entityId2 = interaction.entity_id_2 !== undefined ? interaction.entity_id_2 : '';
            this.properties = [];
            if (interaction.properties !== undefined) {
                for (let index = 0; index < interaction.properties.length; index++) {
                    this.properties.push(new Property(interaction.properties[index]));
                }
            }
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

export interface JSONInteraction {
    id: string;
    type: string;
    entity_id_1: string;
    entity_id_2: string;
    properties: JSONProperty[];
}
