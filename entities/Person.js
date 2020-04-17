'use strict'

const DCDError = require('../lib/DCDError')

const cryptoAlgo = process.env.CRYPTO_ALGO || 'sha256'
const cryptoKey = process.env.CRYPTO_KEY
if (cryptoKey === undefined) throw new DCDError(500, 'Missing CRYPTO_KEY env.')

const crypto = require('crypto')
const idGen = require('../lib/id')

/**
 * A Person represents a physical person, signed up on the hub.
 * It can own, share and have access to Things.
 */
class Person {
  /**
   * @constructor
   * @param {string|object} name The Person as JSON object or the person name
   * @param {string} password The Person password
   * @param {Array<Property>} properties
   * @param {string} id A unique identifier, automatically generated if missing.
   */
  constructor (name, password = undefined, properties = [], id = undefined) {
    if (typeof name === 'object') {
      const person = name

      if (person.id === undefined) {
        validNameAndPassword(person.name, person.password)
        this.id = idGen.toID(person.name)
      } else {
        this.id = person.id
      }
      if (person.name !== undefined) {
        this.name = person.name
      }
      if (person.password !== undefined) {
        this.password = Person.encryptPassword(person.password)
      }

      this.properties =
        person.properties !== undefined ? person.properties : []
    } else {
      if (id === undefined) {
        validNameAndPassword(name, password)
        this.id = idGen.toID(name)
      } else {
        this.id = id
      }
      if (name !== undefined) {
        this.name = name
      }
      if (password !== undefined) {
        this.password = Person.encryptPassword(password)
      }

      this.properties = properties
    }

    if (!this.id.startsWith('dcd:persons:')) {
      this.id = 'dcd:persons:' + this.id
    }

    this.id = this.id.toLowerCase()

    this.readAt = Date.now()
  }

  /**
   * @param password plain text password
   * @returns {string} encrypted password
   */
  static encryptPassword (password) {
    return crypto
      .createHmac(cryptoAlgo, cryptoKey)
      .update(password)
      .digest('hex')
  }
}

module.exports = Person

/**
 * @param {String} name
 * @param {String} password
 */
function validNameAndPassword (name, password) {
  if (typeof name !== 'string') {
    throw new DCDError(4001, 'The field \'name\' is not a string.')
  }
  if (typeof password !== 'string') {
    throw new DCDError(4001, 'The field \'password\' must be a string.')
  }
  if (password.length < 8) {
    throw new DCDError(
      4001,
      'Password is too short. Provide a password with 8 characters or more.'
    )
  }
}
