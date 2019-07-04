"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:kafka]");
logger.level = process.env.LOG_LEVEL || "INFO";

const kafka = require("kafka-node");

const TOPICS = ["things", "properties", "persons", "values"];

class Kafka {
  constructor() {
    logger.info("Kafka constructor");

    this.producerIsReady = false;
    this.producer = null;
    this.client = null;

    this.enable = process.env.KAFKA === "true";
    this.host = process.env.KAFKA_HOST || "localhost";
    this.port =
      process.env.KAFKA_PORT !== undefined
        ? parseInt(process.env.KAFKA_PORT)
        : 9092;

    logger.info("Kafka enabled: " + this.enable);
  }

  /**
   * @param {function} callback
   */
  connect(callback) {
    logger.info("Connecting...");

    if (this.enable) {
      this.client = new kafka.KafkaClient({
        kafkaHost: this.host + ":" + this.port
      });
      this.producer = new kafka.Producer(this.client /*, {partitionerType: 3}*/);

      this.producer.on("ready", () => {
        logger.info("Producer ready");
        this.client.refreshMetadata(TOPICS, () => {
          logger.info("Metadata refresh done.");
          this.producerIsReady = true;
          callback();
        });
      });

      this.producer.on("error", error => {
        logger.error(error);
      });

    } else {
      logger.error("Kafka is disabled");
    }
  }

  pushData(topic, body, key) {
    logger.debug("pushData, key: " + key);
    if (this.enable) {
      if (this.producerIsReady) {
        let messages = [];
        let msgCount = 0;
        body.forEach(msg => {
          if (key !== undefined) {
            messages.push(new kafka.KeyedMessage(key, JSON.stringify(msg)));
          } else {
            messages.push(JSON.stringify(msg));
          }
          msgCount++;
          if (msgCount >= 1000) {
            logger.debug("Push 1000 messages to Kafka");
            this.sendToKafka(topic, messages);
            messages = [];
            msgCount = 0;
          }
        });
        if (messages.length > 0) {
          logger.debug("Push remaining messages to Kafka");
          return this.sendToKafka(topic, messages);
        }
      }
      return Promise.reject({
        code: 500,
        message: "Kafka producer not ready."
      });
    }
    return Promise.reject({code: 500, message: "Kafka not enabled."});
  }

  setConsumer(topics, options, onMessage) {

    const consumer = new kafka.Consumer(this.client, topics, options);
    const offset = new kafka.Offset(this.client);

    consumer.on('message', onMessage);

    consumer.on('error', (error) => {
      logger.error('error', error);
    });

    /*
       * If consumer get `offsetOutOfRange` event,
       * fetch data from the smallest(oldest) offset
       */
    consumer.on('offsetOutOfRange', (topic) => {
      topic.maxNum = 2;
      offset.fetch([topic], (error, offsets) => {
        if (error) {
          return logger.error(error);
        }
        const min = Math.min.apply(null,
          offsets[topic.topic][topic.partition]);
        consumer.setOffset(topic.topic, topic.partition, min);
      });
    });
  }

  /**
   * @param {String} topic
   * @param {String} messages
   * @returns {Promise}
   */
  sendToKafka(topic, messages) {
    logger.debug(
      "Send Data to " + topic + " message: " + JSON.stringify(messages)
    );
    return new Promise((resolve, reject) => {
      const payloads = [{topic: topic, messages: messages}];
      this.producer.send(payloads, error => {
        if (error) {
          return reject(error);
        }
        return resolve();
      });
    });
  }
}

module.exports = Kafka;
