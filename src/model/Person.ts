'use strict';

import { JSONProperty, Property } from './Property';

import { DCDError } from '../lib/Error';

const cryptoAlgo = process.env.CRYPTO_ALGO || 'sha256';
const cryptoKey = process.env.CRYPTO_KEY;
if (cryptoKey === undefined) throw new DCDError(500, 'Missing CRYPTO_KEY env.');

import crypto = require('crypto');
import { toID } from '../lib/id';
import { Entity } from './Entity';

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
export class Person extends Entity {
    private readonly _password: string;
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
        super();
        if (typeof name === 'object') {
            const person = name as JSONPerson;

            if (person.id === undefined) {
                validNameAndPassword(person.name, person.password);
                this._id = toID(person.name);
            } else {
                this._id = person.id;
            }
            if (person.name !== undefined) {
                this._name = person.name;
            }
            if (person.password !== undefined) {
                this._password = Person.encryptPassword(person.password);
            }
            this.setJSONProperties(person.properties);
        } else {
            if (id === undefined) {
                validNameAndPassword(name, password);
                this._id = toID(name);
            } else {
                this._id = id;
            }
            if (name !== undefined) {
                this._name = name;
            }
            if (password !== undefined) {
                this._password = Person.encryptPassword(password);
            }

            this._properties = properties;
        }
        if (!this.id.startsWith('dcd:persons:')) {
            this._id = 'dcd:persons:' + this.id;
        }
        this._id = this.id.toLowerCase();
    }

    get password(): string {
        return this._password;
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
