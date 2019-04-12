"use strict";

const cryptoAlgo = process.env.CRYPTO_ALGO || "sha256";
const cryptoKey = process.env.CRYPTO_KEY;
if (cryptoKey === undefined) throw Error("Missing CRYPTO_KEY env.");

const crypto = require("crypto");
const idGen = require("../lib/id");

class Person {
  /**
   * @constructor
   */
  constructor(name, password = undefined, properties = [], id) {
    if (typeof name === "object") {
      const person = name;

      if (person.id === undefined) {
        validNameAndPassword(person.name, person.password);
        this.id = idGen.toID(person.name);
      } else {
        this.id = person.id;
      }

      if (person.name !== undefined) {
        this.name = person.name;
      }
      if (person.password !== undefined) {
        this.password = Person.encryptPassword(person.password);
      }

      this.properties =
        person.properties !== undefined ? person.properties : [];
    } else {
      if (id === undefined) {
        validNameAndPassword(name, password);
        this.id = idGen.toID(name);
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

    this.readAt = Date.now();
  }

  /**
   * @param password plain text password
   * @returns {string} encrypted password
   */
  static encryptPassword(password) {
    return crypto
      .createHmac(cryptoAlgo, cryptoKey)
      .update(password)
      .digest("hex");
  }
}

module.exports = Person;

/**
 * @param {String} name
 * @param {String} password
 */
function validNameAndPassword(name, password) {
  if (typeof name !== "string" || typeof password !== "string") {
    throw new Error("Name is undefined.");
  }
  if (password.length < 8) {
    throw new Error("Password is too short (Minimum 8 characters).");
  }
}
