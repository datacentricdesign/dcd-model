'use strict';

// Setting the logs
import log4js = require('log4js');
const logger = log4js.getLogger('[dcd:kafka]');
logger.level = process.env.LOG_LEVEL || 'INFO';

import { DCDError } from '../lib/Error';

import { KafkaClient, Producer, Consumer, KeyedMessage, Offset } from 'kafka-node';

const TOPICS = ['things', 'properties', 'persons', 'values'];

export class Kafka {
    enable = false;
    producerIsReady = false;
    producer: Producer;
    client: KafkaClient;
    host: string;
    port: number;
    constructor() {
        logger.info('Kafka constructor');

        this.producerIsReady = false;
        this.producer = null;
        this.client = null;

        this.enable = process.env.KAFKA === 'true';
        this.host = process.env.KAFKA_HOST || 'localhost';
        this.port = process.env.KAFKA_PORT !== undefined ? parseInt(process.env.KAFKA_PORT) : 9092;

        logger.info('Kafka enabled: ' + this.enable);
    }

    /**
     * @param {function} callback
     */
    connect(callback): void {
        logger.info('Connecting...');

        if (this.enable) {
            this.client = new KafkaClient({
                kafkaHost: this.host + ':' + this.port,
            });
            this.producer = new Producer(this.client /*, {partitionerType: 3}*/);

            this.producer.on('ready', () => {
                logger.info('Producer ready');
                this.client.refreshMetadata(TOPICS, () => {
                    logger.info('Metadata refresh done.');
                    this.producerIsReady = true;
                    callback();
                });
            });

            this.producer.on('error', error => {
                logger.error(error);
            });
        } else {
            logger.error('Kafka is disabled');
        }
    }

    pushData(topic: string, body, key): Promise<void> {
        if (this.enable) {
            if (this.producerIsReady) {
                let messages = [];
                let msgCount = 0;
                body.forEach(msg => {
                    if (key !== undefined) {
                        messages.push(new KeyedMessage(key, JSON.stringify(msg)));
                    } else {
                        messages.push(JSON.stringify(msg));
                    }
                    msgCount++;
                    if (msgCount >= 1000) {
                        this.sendToKafka(topic, messages);
                        messages = [];
                        msgCount = 0;
                    }
                });
                if (messages.length > 0) {
                    return this.sendToKafka(topic, messages);
                }
            }
            return Promise.reject(new DCDError(500, 'Kafka producer not ready.'));
        }
        return Promise.reject(new DCDError(500, 'Kafka not enabled.'));
    }

    setConsumer(topics, options, onMessage) {
        const consumer = new Consumer(this.client, topics, options);
        const offset = new Offset(this.client);

        consumer.on('message', onMessage);

        consumer.on('error', error => {
            logger.error('error', error);
        });

        /*
         * If consumer get `offsetOutOfRange` event,
         * fetch data from the smallest(oldest) offset
         */
        consumer.on('offsetOutOfRange', topic => {
            topic.maxNum = 2;
            offset.fetch([topic], (error, offsets) => {
                if (error) {
                    return logger.error(error);
                }
                const min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
                consumer.setOffset(topic.topic, topic.partition, min);
            });
        });
    }

    /**
     * @param {String} topic
     * @param {String} messages
     * @returns {Promise}
     */
    sendToKafka(topic, messages): Promise<void> {
        logger.debug('Send Data to ' + topic + ' message: ' + JSON.stringify(messages));
        return new Promise((resolve, reject) => {
            const payloads = [{ topic: topic, messages: messages }];
            this.producer.send(payloads, error => {
                if (error) {
                    return reject(error);
                }
                return resolve();
            });
        });
    }
}
