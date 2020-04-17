const ThingService = require("./services/ThingService");
const InteractionService = require("./services/InteractionService");
const PersonService = require("./services/PersonService");
const PropertyService = require("./services/PropertyService");
const TaskService = require("./services/TaskService");
const StatService = require("./services/StatService");

const MySQL = require("./dao/mysql");
const Kafka = require("./dao/kafka");
const InfluxDb = require("./dao/influxdb");

let authEnabled =
  process.env.AUTH_ENABLED === undefined || process.env.AUTH_ENABLED === "true";
if (authEnabled === undefined) authEnabled = true;

class DCDModel {
  constructor() {
    this.setDAO();

    this.kafka = new Kafka();

    this.setServices();

    if (authEnabled) {
      const Auth = require("./lib/Auth");
      this.auth = new Auth(this);
    }

    const Policies = require("./lib/Policies");
    this.policies = new Policies(this);
  }

  init() {
    return new Promise(resolve => {
      this.kafka.connect(resolve);
    });
  }

  setDAO() {
    const host = process.env.MODEL_HOST || "mysql";
    const user = process.env.MODEL_USER || "root";
    const pass = process.env.MODEL_PASS || "example";
    const name = process.env.MODEL_NAME || "dcdhub";

    this.dao = new MySQL();
    this.dao.connect(host, user, pass, name);

    const influxHost = process.env.INFLUXDB_HOST || "influxdb";
    const influxDatabase = process.env.INFLUXDB_NAME || "dcdhub";
    this.influxdb = new InfluxDb(influxHost, influxDatabase);
  }

  setServices() {
    this.things = new ThingService(this);
    this.interactions = new InteractionService(this);
    this.persons = new PersonService(this);
    this.properties = new PropertyService(this);
    this.tasks = new TaskService(this);
    this.stats = new StatService(this);
  }

  shutdown() {
    this.dao.disconnect();

    this.kafka.disconnect();
  }
}

module.exports = DCDModel;
