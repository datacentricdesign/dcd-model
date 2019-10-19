"use strict";

const InfluxDB = require("../dao/influxdb");
const Thing = require("../entities/Thing");
const Property = require("../entities/Property");

describe("createThing()", () => {
  before(() => {
    // runs before all tests in this block
    this.influx = new InfluxDB("localhost", "dcdhub");

    this.influx.createStore().catch(error => {
      console.log(error);
    });
  });

  const thing = new Thing("test-thing", "desc test thing", "test");
  const property = new Property(
    "test-property",
    "desc test property",
    "THREE_DIMENSIONS"
  );
  property.entityId = thing.id;
  it("Create Things", () => {
    this.influx.createThings([thing]).catch(error => {
      console.log(error);
    });
  });

  it("Create Properties", () => {
    this.influx.createProperties(thing.id, [property]).catch(error => {
      console.log(error);
    });
  });

  it("Create values", () => {
    this.influx.createValues(thing.id, property.id, [Date.now(), 1, 2, 3]).catch(error => {
      console.log(error);
    });
  });

  it("Get values", () => {
    this.influx
      .readPropertyValues(property, 0, Date.now())
      .then(result => {
        console.log(JSON.stringify(result));
      })
      .catch(error => {
        console.log(error);
      });
  });

  after(() => {
    // runs after all tests in this block
    // this.influx.deleteStore().catch(error => {
    //   console.log(error);
    // });
  });
});
