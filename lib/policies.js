"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd-api:lib:policies]");
logger.level = process.env.LOG_LEVEL || "INFO";

const url = require("url");
const fetch = require("node-fetch");

/**
 *
 * @param policy
 * @returns {Promise<void>}
 */
const create = policy => {
  const ketoUrl = url.parse(process.env.KETO_URL);
  const headers = {
    "Content-Type": "application/json"
  };
  if (process.env.HTTPS !== undefined) {
    logger.debug("HTTPS on, adding XFP header");
    headers["X-Forwarded-Proto"] = "https";
  }
  return fetch(ketoUrl.href + "engines/acp/ory/exact/policies", {
    headers: headers,
    method: "PUT",
    body: JSON.stringify(policy)
  })
    .then(result => {
      return Promise.resolve(result);
    })
    .catch(error => {
      logger.debug(error);
      return Promise.reject({ error: "Not allowed" });
    });
};

exports.create = create;

const roleToActions = role => {
  switch (role) {
    case "reader":
      return ["dcd:actions:read"];
    case "owner":
      return [
        "dcd:actions:create",
        "dcd:actions:list",
        "dcd:actions:read",
        "dcd:actions:update",
        "dcd:actions:delete",
        "dcd:actions:grant",
        "dcd:actions:revoke"
      ];
    case "subject":
      return ["dcd:actions:create", "dcd:actions:read", "dcd:actions:update"];
    default:
      return [];
  }
};

exports.roleToActions = roleToActions;
