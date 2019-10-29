import { ThingService } from './services/ThingService';
import { InteractionService } from './services/InteractionService';
import { PersonService } from './services/PersonService';
import { PropertyService } from './services/PropertyService';
import { StatsService } from './services/StatsService';

import { MySQL } from './dao/mysql';
import { Kafka } from './dao/kafka';
import { InfluxDB } from './dao/influxdb';

import { Auth } from './lib/Auth';
import { Policies } from './lib/Policies';

let authEnabled = process.env.AUTH_ENABLED === undefined || process.env.AUTH_ENABLED === 'true';
if (authEnabled === undefined) authEnabled = true;

export class DCDModel {
    auth: Auth;
    policies: Policies;

    kafka: Kafka;
    dao: MySQL;
    influxdb: InfluxDB;

    things: ThingService;
    interactions: InteractionService;
    persons: PersonService;
    properties: PropertyService;
    stats: StatsService;

    constructor() {
        this.setDAO();

        this.kafka = new Kafka();

        this.setServices();

        if (authEnabled) {
            this.auth = new Auth(this);
        }

        this.policies = new Policies(this);
    }

    init() {
        return new Promise(resolve => {
            this.kafka.connect(resolve);
        });
    }

    setDAO() {
        const host = process.env.MODEL_HOST || 'mysql';
        const user = process.env.MODEL_USER || 'root';
        const pass = process.env.MODEL_PASS || 'example';
        const name = process.env.MODEL_NAME || 'dcdhub';

        this.dao = new MySQL();
        this.dao.connect(host, user, pass, name);

        const influxHost = process.env.INFLUXDB_HOST || 'influxdb';
        const influxDatabase = process.env.INFLUXDB_NAME || 'dcdhub';
        this.influxdb = new InfluxDB(influxHost, influxDatabase);
    }

    setServices() {
        this.things = new ThingService(this);
        this.interactions = new InteractionService(this);
        this.persons = new PersonService(this);
        this.properties = new PropertyService(this);
        this.stats = new StatsService(this);
    }
}
