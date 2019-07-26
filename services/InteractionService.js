"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:interactions]");
logger.level = process.env.LOG_LEVEL || "INFO";

const idGen = require("../lib/id");

class InteractionService {
  /**
   *
   * @constructor
   */
  constructor(newModel) {
    this.model = newModel;
  }

  /**
   * Create a new Interaction.
   *
   * @param {Interaction} interaction
   * returns interaction
   **/
  create(interaction) {
    return this.readByIdOrEntityId(interaction)
      .then(retrievedInteraction => {
        // Read positive, the Interaction already exist
        return Promise.reject({
          code: 400,
          message: "Interaction " + retrievedInteraction.id + " already exist."
        });
      })
      .catch(error => {
        // Read negative, the interaction does not exist yet
        if (error.code === 404) {
          logger.debug(
            "create: Interaction does not exist, sending it to Kafka"
          );

          if (interaction.id === undefined) {
            interaction.id = idGen.uuidv4();
          }
          return this.model.dao
            .createInteraction(interaction)
            .then(() => {
              // Publish the interaction to kafka
              return this.toKafka(interaction);
            })
            .then(() => {
              return Promise.resolve(interaction);
            })
            .catch(error => {
              return Promise.reject(error);
            });
        } else {
          return Promise.reject(error);
        }
      });
  }

  readByIdOrEntityId(interaction) {
    if (interaction.id === undefined) {
      return this.model.interactions.readByEntityId(interaction.entityId1, interaction.entityId2);
    } else {
      return this.model.interactions.read(interaction.id);
    }
  }

  /**
   * List some Interactions.
   * @param {String} actorId
   * @param {String} entityDestId (optional)
   **/
  list(actorId, entityDestId) {
    return this.model.dao.listInteractions(actorId, entityDestId);
  }

  /**
   * Read an Interaction.
   * @param {String} id
   * returns {Interaction}
   **/
  read(id) {
    let interaction = {};
    return this.model.dao
      .readInteraction(id)
      .then(result => {
        interaction = result;
        return this.model.properties.list(id);
      })
      .then(results => {
        interaction.properties = results;
        return Promise.resolve(interaction);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   * Read an Interaction from two entity ids.
   * @param {String} entityId1
   * @param {String} entityId2
   * returns {Interaction}
   **/
  readByEntityId(entityId1, entityId2) {
    let interaction = {};
    return this.model.dao
      .readInteractionByEntityId(entityId1, entityId2)
      .then(retrievedInteraction => {
        interaction = retrievedInteraction;
        return this.model.properties.list(interaction.id);
      })
      .then(results => {
        interaction.properties = results;
        return Promise.resolve(interaction);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   * Delete an interaction
   * @param interactionId
   * @return {Promise}
   */
  del(interactionId) {
    return this.model.dao.deleteInteraction(interactionId);
  }

  /**
   * Send Interaction to Kafka.
   * @param {Interaction} interaction
   */
  toKafka(interaction) {
    return this.model.kafka.pushData(
      "interactions",
      [interaction],
      interaction.id
    );
  }
}

/**
 * Generate an access policy for a thing.
 * @param thingId
 * @returns {Promise<>}
 */
function createAccessPolicy(interactionId, thingId1, thingId2) {
  const thingPolicy = {
    id: thingId1 + "-" + thingId2 + "-int-" + "-crud-policy",
    effect: "allow",
    actions: ["dcd:actions:read", "dcd:actions:update", "dcd:actions:delete"],
    subjects: ["dcd:things:" + thingId1, "dcd:things:" + thingId2],
    resources: [
      "dcd:interactions:" + interactionId,
      "dcd:interactions:" + interactionId + ":properties",
      "dcd:interactions:" + interactionId + ":properties:<.*>"
    ]
  };
  logger.debug("Thing policy: " + JSON.stringify(thingPolicy));
  return policies.create(thingPolicy);
}

module.exports = InteractionService;
