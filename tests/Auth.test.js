"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[OAuth:Test]");
logger.level = process.env.LOG_LEVEL || "INFO";

// Load the model
const DCDModel = require("../index");
const Thing = require("../entities/Thing");
const Property = require("../entities/Property");

const model = new DCDModel();

let createdTh;

model
  .init()

  // Test: create a Thing
  .then(() => {
    const personId = "testUser";
    const thing = new Thing("test", "test thing desc", "Smart-phone");
    return model.things.create(personId, thing, true);
  })

  // Test: create a Property
  .then(createdThing => {
    createdTh = createdThing;
    const property = new Property(
      "test prop",
      "test prop desc",
      "ACCELEROMETER"
    );
    property.entityId = createdThing.id;
    return model.properties.create(property);
  })

  // Test: check authentication
  .then(() => {
    return model.auth.checkJWTAuth(createdTh.keys.jwt, createdTh.id);
  })

  // Test: check authorisation to access resource
  .then(introspection => {
    logger.debug(introspection);
    const acp = {
      resource: "dcd:things:" + createdTh.id,
      action: "dcd:actions:read",
      subject: "dcd:things:" + createdTh.id
    };
    logger.debug(acp);
    return model.auth.wardenSubject(acp);
  })

  // Test: get back the JWK from Hydra
  .then(() => {
    return model.auth.getJWK(createdTh.id);
  })
  .catch(error => {
    logger.error(error);
  });
