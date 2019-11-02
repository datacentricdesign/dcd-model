'use strict';

import { uuidv4 } from '../lib/id';
import { Property, JSONProperty } from './Property';
import { Entity } from './Entity';

export class Interaction extends Entity {
    private readonly _entityId1: string;
    private readonly _entityId2: string;
    private readonly _type: string;
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
        super();
        if (typeof type === 'object') {
            const interaction = type as JSONInteraction;
            this._id = interaction.id;
            this._entityId1 = interaction.entity_id_1 !== undefined ? interaction.entity_id_1 : '';
            this._entityId2 = interaction.entity_id_2 !== undefined ? interaction.entity_id_2 : '';
            this.setJSONProperties(interaction.properties);
        } else {
            this._id = id !== undefined ? id : uuidv4();
            this._type = type;
            this._entityId1 = entityId1;
            this._entityId2 = entityId2;
            this._properties = properties;
        }
    }

    get entityId1(): string {
        return this._entityId1;
    }

    get entityId2(): string {
        return this._entityId2;
    }

    get type(): string {
        return this._type;
    }
}

export interface JSONInteraction {
    id: string;
    type: string;
    entity_id_1: string;
    entity_id_2: string;
    properties: JSONProperty[];
}
