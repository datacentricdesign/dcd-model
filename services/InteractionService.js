"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:interactions]");
logger.level = process.env.LOG_LEVEL || "INFO";

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
   * @param {String} actorId
   * @param {Interaction} interaction
   * returns interaction
   **/
  create(actorId, interaction) {
    return this.model.interactions
      .read(interaction.id)
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

          return this.model.dao
            .createInteraction(interaction)
            .then(() => {
              // Publish the interaction to kafka
              return this.toKafka(interaction);
            })
            .catch(error => {
              return Promise.reject(error);
            });
        } else {
          return Promise.reject(error);
        }
      });
  }

  /**
   * List some Interactions.
   * @param {String} actorId
   **/
  list(actorId) {
    return this.model.dao.listInteractions(actorId);
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

module.exports = InteractionService;
