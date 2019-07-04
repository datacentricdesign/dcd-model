const ThingService = require("./services/ThingService");
const InteractionService = require("./services/InteractionService");
const PersonService = require("./services/PersonService");
const PropertyService = require("./services/PropertyService");
const MySQL = require("./dao/mysql");

const Kafka = require("./dao/kafka");

let authEnabled = process.env.AUTH_ENABLED === undefined
                    || process.env.AUTH_ENABLED === "true";
if (authEnabled === undefined) authEnabled = true;

class DCDModel {
  constructor() {
    this.setDAO();

    this.kafka = new Kafka();

    this.setServices();

    if (authEnabled) {
      const Auth = require("./lib/Auth");
      this.auth = new Auth();
    }

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
  }

  setServices() {
    this.things = new ThingService(this);
    this.interactions = new InteractionService(this);
    this.persons = new PersonService(this);
    this.properties = new PropertyService(this);
  }
}

module.exports = DCDModel;
