// map of things by name (cache)
const thingMap = {};
// map interaction thing id 1 / thing id 2
const interaction = {};

// read csv
const lineReader = require("readline").createInterface({
  input: require("fs").createReadStream("file.in")
});

lineReader.on("line", function(line) {
  console.log("Line from file:", line);

  const lineArray = line.split(",");
  let thing1, thing2;
  const apName = lineArray[4];
  const apDesc = lineArray[3];
  findOrCreateThingDevice(apName, apDesc, "Access Point")
    .then(thing => {
      thing1 = thing;
      const user = lineArray[0];
      const mac = lineArray[1];
      return findOrCreateThingDevice(mac, user, "WiFi Device");
    })
    .then(thing => {
      thing2 = thing;
      return findOrCreateInteraction(thing1, thing2);
    })
    .then(interactionId => {
      const time = lineArray[2];
      const duration = lineArray[5];
      const snr = lineArray[6];
      const rssi = lineArray[7];
      return createOrUpdateInteractionProperty(
        interactionId,
        thing1,
        time,
        duration,
        snr,
        rssi
      );
    });
});

function findOrCreateThingDevice(name, description, type) {
  if (thingMap.contains(name)) {
    return Promise.resolve(thingMap[name]);
  }
  const deviceJson = {
    name: macAddress,
    description: "User " + user,
    type: type
  };
  return request("POST", "/things", deviceJson)
    .then(() => {
      return request("GET", "/things");
    })
    .then(thing => {
      thingMap[name] = thing;
      return Promise.resolve(thing);
    });
}

function findOrCreateInteraction(thing1, thing2) {
  const apiListInteraction =
    "/things/" + thing1.id + "/interactions?entity=" + thing2.id;

  return request("GET", apiListInteraction).then(interactions => {
    // if interaction exist
    if (interactions.length === 1) {
      return Promise.resolve(interactions[0].id);
    }

    // otherwise create interaction
    const apiCreateInteraction = "/things/" + thingId1 + "/interactions";
    const interactionJson = {
      entityId1: thing1.id,
      entityId2: thing2.id
    };
    return request("POST", apiCreateInteraction, interactionJson);
  });
}

function createOrUpdateInteractionProperty(
  interactionId,
  thingId,
  time,
  duration,
  snr,
  rssi
) {
  const propertyJson = {
    type: "WIFI",
    values: [[time, duration, snr, rssi]]
  };
  const api =
    "/things/" + thingId + "/interactions/" + interactionId + "/properties";
  return request("POST", api, propertyJson);
}

function request(method, api, propertyJson) {

}