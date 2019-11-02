'use strict';

import { JSONProperty } from './Property';
import { DCDError } from '../lib/Error';
import { toID } from '../lib/id';
import { Entity } from './Entity';

/**
 * A Thing represents a physical or virtual component collecting data.
 * For example, a phone which collects acceleration, a website recording
 * number of page views.
 */
export class Thing extends Entity {
    private readonly _description: string;
    private readonly _type: string;
    private _keys: {};
    private _pem: string;
    /**
     * @constructor
     * @param {string|object} name The Thing as JSON object or the Thing name
     * @param {string} description The Thing description
     * @param {string} type The Thing Type
     * @param {Array<Property>} properties
     * @param {string} id A unique identifier, automatically generated if missing.
     */
    constructor(name: string | JSONThing = '', description = '', type = '', properties = [], id?: string) {
        super();
        if (typeof name === 'object') {
            const thing = name;
            this._id = thing.id !== undefined ? thing.id : toID(thing.name);
            this._name = thing.name !== undefined ? thing.name : '';
            this._description = thing.description !== undefined ? thing.description : '';
            this._type = thing.type !== undefined ? thing.type : '';
            this.setJSONProperties(thing.properties);

            if (thing.registered_at !== undefined) {
                this._registeredAt = thing.registered_at;
            }
            if (thing.pem !== undefined) {
                this._pem = thing.pem;
            }
        } else {
            this._id = id !== undefined ? id : toID(name);
            this._name = name;
            this._description = description;
            this._type = type;
            this._properties = properties;
        }

        if (!this._id.startsWith('dcd:things:')) {
            this._id = 'dcd:things:' + this._id;
        }

        this._keys = {};
    }

    get description(): string {
        return this._description;
    }

    get type(): string {
        return this._type;
    }

    get keys(): {} {
        return this._keys;
    }

    set keys(value: {}) {
        this._keys = value;
    }

    get pem(): string {
        return this._pem;
    }

    set pem(value: string) {
        this._pem = value;
    }

    findPropertyByName(name: string) {
        for (const key in this.properties) {
            const property = this.properties[key];
            if (property.name === name) {
                return property;
            }
        }
        throw new DCDError(404, `Property with name ${name} not found`);
    }
}

export interface JSONThing {
    id?: string;
    name: string;
    description: string;
    type: string;
    properties?: JSONProperty[];
    registered_at?: number;
    pem?: string;
}
