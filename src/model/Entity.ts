'use strict';

import { JSONProperty, Property } from './Property';

/**
 * Entity is the superclass of a Person, a Thing or an Interaction.
 */
export class Entity {
    protected _id: string;
    private _name: string;

    protected _properties: Property[];

    protected _readAt: number = Date.now();
    protected _registeredAt: number;

    setJSONProperties(jsonProperties: JSONProperty[]): void {
        this._properties = [];
        if (jsonProperties !== undefined && Array.isArray(jsonProperties)) {
            for (let index = 0; index < jsonProperties.length; index++) {
                this._properties.push(new Property(jsonProperties[index]));
            }
        }
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get properties(): Property[] {
        return this._properties;
    }

    set properties(value: Property[]) {
        this._properties = value;
    }

    get readAt(): number {
        return this._readAt;
    }

    get registeredAt(): number {
        return this._registeredAt;
    }
}

export interface JSONEntity {
    id: string;
    name: string;
    properties?: JSONProperty[];
}
