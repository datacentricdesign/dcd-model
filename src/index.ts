import { ThingService } from './services/ThingService';
import { InteractionService } from './services/InteractionService';
import { PersonService } from './services/PersonService';
import { PropertyService } from './services/PropertyService';
import { StatsService } from './services/StatsService';

import { MySQLStore } from './store/MySQLStore';
import { KafkaStore } from './store/KafkaStore';
import { InfluxDBStore } from './store/InfluxDBStore';

import { Auth } from './lib/Auth';
import { Policies } from './lib/Policies';

let authEnabled = process.env.AUTH_ENABLED === undefined || process.env.AUTH_ENABLED === 'true';
if (authEnabled === undefined) authEnabled = true;

export class DCDModel {
    auth: Auth;
    policies: Policies;

    kafka: KafkaStore;
    dao: MySQLStore;
    influxdb: InfluxDBStore;

    things: ThingService;
    interactions: InteractionService;
    persons: PersonService;
    properties: PropertyService;
    stats: StatsService;

    constructor() {
        this.setDAO();

        this.kafka = new KafkaStore();

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

        this.dao = new MySQLStore();
        this.dao.connect(host, user, pass, name);

        const influxHost = process.env.INFLUXDB_HOST || 'influxdb';
        const influxDatabase = process.env.INFLUXDB_NAME || 'dcdhub';
        this.influxdb = new InfluxDBStore(influxHost, influxDatabase);
    }

    setServices() {
        this.things = new ThingService(this);
        this.interactions = new InteractionService(this);
        this.persons = new PersonService(this);
        this.properties = new PropertyService(this);
        this.stats = new StatsService(this);
    }
}
