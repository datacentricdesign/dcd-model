'use strict'

const idGen = require('../lib/id')

class Task {
  /**
   *
   * @param {String|object} name
   * @param {String} description
   * @param {String[]} types
   * @param {number} from
   * @param {number} to
   * @param {String} actorEntityId
   * @param  id
   */
  constructor (
    name = '',
    types = [],
    description = '',
    from = 0,
    to = 0,
    actorEntityId = undefined,
    id,
  ) {
    if (typeof name === 'object') {
      const task = name
      this.id = task.id !== undefined ? task.id : idGen.toID(task.name)
      this.name = task.name !== undefined ? task.name : ''
      this.description = task.description !== undefined ? task.description : ''

      if (Array.isArray(task.types)) {
        this.types = task.types
      } else {
        if (typeof task.types === 'string') {
          this.types = task.types.split(',')
        } else {
          this.types = []
        }
      }

      this.from = task.from !== undefined ? task.from : 0
      this.to = task.to !== undefined ? task.to : Date.now()
      this.actorEntityId = task.actor_entity_id !== undefined ? task.actor_entity_id : null

      if (task.registered_at !== undefined) {
        this.registeredAt = task.registered_at
      }

    } else {
      this.id = id !== undefined ? id : idGen.toID(name)
      this.name = name
      this.description = description

      if (Array.isArray(types)) {
        this.types = types
      } else {
        if (typeof types === 'string') {
          this.types = types.split(',')
        } else {
          this.types = []
        }
      }

      this.from = from
      this.to = to
      this.actorEntityId = actorEntityId
    }
    this.readAt = Date.now()
  }
}

module.exports = Task
