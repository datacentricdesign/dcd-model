const ThingService = require("./services/ThingService");
const PersonService = require("./services/PersonService");
const PropertyService = require("./services/PropertyService");
const Auth = require("./lib/Auth");
const MySQL = require("./dao/mysql");

const Kafka = require("./dao/kafka");

class DCDModel {
  constructor() {
    this.setDAO();

    this.kafka = new Kafka();

    this.setServices();

    this.auth = new Auth();
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
    this.persons = new PersonService(this);
    this.properties = new PropertyService(this);
  }
}

module.exports = DCDModel;
