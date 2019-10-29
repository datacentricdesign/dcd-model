'use strict';

import { JSONProperty, Property } from './Property';

import { DCDError } from '../lib/Error';

const cryptoAlgo = process.env.CRYPTO_ALGO || 'sha256';
const cryptoKey = process.env.CRYPTO_KEY;
if (cryptoKey === undefined) throw new DCDError(500, 'Missing CRYPTO_KEY env.');

import crypto = require('crypto');
import { toID } from '../lib/id';

/**
 * @param {String} name
 * @param {String} password
 */
function validNameAndPassword(name, password): boolean {
    if (typeof name !== 'string') {
        throw new DCDError(4001, "The field 'name' is not a string.");
    }
    if (typeof password !== 'string') {
        throw new DCDError(4001, "The field 'password' must be a string.");
    }
    if (password.length < 8) {
        throw new DCDError(4001, 'Password is too short. Provide a password with 8 characters or more.');
    }
    return true;
}

/**
 * A Person represents a physical person, signed up on the hub.
 * It can own, share and have access to Things.
 */
export class Person {
    id: string;
    properties: Property[];
    password: string;
    name: string;
    readAt: number;
    /**
     * @constructor
     * @param {string|object} name The Person as JSON object or the person name
     * @param {string} password The Person password
     * @param {Array<Property>} properties
     * @param {string} id A unique identifier, automatically generated if missing.
     */
    constructor(
        name: string | JSONPerson,
        password: string = undefined,
        properties: Property[] = [],
        id: string = undefined,
    ) {
        if (typeof name === 'object') {
            const person = name as JSONPerson;

            if (person.id === undefined) {
                validNameAndPassword(person.name, person.password);
                this.id = toID(person.name);
            } else {
                this.id = person.id;
            }
            if (person.name !== undefined) {
                this.name = person.name;
            }
            if (person.password !== undefined) {
                this.password = Person.encryptPassword(person.password);
            }

            this.properties = [];
            if (person.properties !== undefined) {
                for (let index = 0; index < person.properties.length; index++) {
                    this.properties.push(new Property(person.properties[index]));
                }
            }
        } else {
            if (id === undefined) {
                validNameAndPassword(name, password);
                this.id = toID(name);
            } else {
                this.id = id;
            }
            if (name !== undefined) {
                this.name = name;
            }
            if (password !== undefined) {
                this.password = Person.encryptPassword(password);
            }

            this.properties = properties;
        }

        if (!this.id.startsWith('dcd:persons:')) {
            this.id = 'dcd:persons:' + this.id;
        }

        this.id = this.id.toLowerCase();

        this.readAt = Date.now();
    }

    /**
     * @param password plain text password
     * @returns {string} encrypted password
     */
    static encryptPassword(password): string {
        return crypto
            .createHmac(cryptoAlgo, cryptoKey)
            .update(password)
            .digest('hex');
    }
}

export interface JSONPerson {
    id: string;
    name: string;
    password?: string;
    properties?: JSONProperty[];
}
