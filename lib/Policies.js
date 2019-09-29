"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd-api:lib:policies]");
logger.level = process.env.LOG_LEVEL || "INFO";

const url = require("url");
const fetch = require("node-fetch");

const DCDError = require("./Error");

/**
 * Manage access policies
 */
class Policies {
  /**
   *
   * @param {DCDModel} model
   */
  constructor(model) {
    this.model = model;
    this.ketoUrl = url.parse(process.env.KETO_URL);

    this.ketoHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    if (process.env.HTTPS !== undefined) {
      this.ketoHeaders["X-Forwarded-Proto"] = "https";
    }
  }

  /**
   * Grant a role on a resource entity to a subject entity
   * @param {string} subjectId
   * @param {string} resourceId
   * @param {string} roleName
   * returns Promise
   **/
  grant(subjectId, resourceId, roleName) {
    this.readPolicy(subjectId, resourceId, roleName)
      .then(policyId => {
        // There is an existing policy, let's update
        this.createPolicy(subjectId, resourceId, roleName, "allow", policyId);
      })
      .catch(error => {
        if (error.code === 4001) {
          // No existing policy (Not found)
          return this.createPolicy(subjectId, resourceId, roleName, "allow");
        }
        return Promise.reject(error); // Otherwise, something went wrong
      });
  }

  /**
   * Revoke a role on a resource entity to a subject entity
   * @param {string} subjectId
   * @param {string} resourceId
   * @param {string} roleName
   * returns Promise
   **/
  revoke(subjectId, resourceId, roleName) {
    this.readPolicy(subjectId, resourceId, roleName)
      .then(policyId => {
        // There is an existing policy, let's update
        this.createPolicy(subjectId, resourceId, roleName, "deny", policyId);
      })
      .catch(error => {
        if (error.code === 4001) {
          // No existing policy (Not found)
          return this.createPolicy(subjectId, resourceId, roleName, "deny");
        }
        return Promise.reject(error); // Otherwise, something went wrong
      });
  }

  readPolicy(subjectId, resourceId, roleName) {
    this.model.dao
      .readRoleId(subjectId, resourceId, roleName)
      .then(sqlResult => {
        if (sqlResult.length === 1) {
          return Promise.resolve(sqlResult[0].id);
        }
        return Promise.reject(new DCDError(4005, "Role not found"));
      });
  }

  createPolicy(
    subjectId,
    resourceId,
    roleName,
    effect = "allow",
    id = undefined
  ) {
    this.model.dao
      .createRole(subjectId, resourceId, roleName)
      .then(sqlResults => {
        const policy = {
          id: id !== undefined ? id : String(sqlResults.insertId),
          effect: effect,
          actions: roleToActions(roleName),
          subjects: [subjectId],
          resources: entityToResource(resourceId)
        };
        return this.updateKetoPolicy(policy);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  deletePolicy(subjectId, resourceId, roleName) {
    return this.readPolicy(subjectId, resourceId, roleName)
      .then(policyId => {
        // There is an existing policy, let's update
        return this.model.dao
          .deleteRole(subjectId, resourceId, roleName)
          .then(() => {
            return this.deleteKetoPolicy(policyId);
          })
          .catch(error => {
            return Promise.reject(error);
          });
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  check(acp) {
    const url = this.ketoUrl.href + "/engines/acp/ory/regex/allowed";
    const options = {
      headers: this.ketoHeaders,
      method: "POST",
      body: JSON.stringify(acp)
    };
    return fetch(url, options)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        return Promise.reject(new DCDError(res.status, res.statusText));
      })
      .then(body => {
        if (!body.allowed) {
          return Promise.reject(new DCDError(403, "Request was not allowed"));
        }
        return Promise.resolve(body);
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   *
   * @param policy
   * @returns {Promise<void>}
   */
  updateKetoPolicy(policy) {
    return fetch(this.ketoUrl.href + "engines/acp/ory/regex/policies", {
      headers: this.ketoHeaders,
      method: "PUT",
      body: JSON.stringify(policy)
    })
      .then(result => {
        return Promise.resolve(result);
      })
      .catch(error => {
        logger.debug(error);
        return Promise.reject(
          new DCDError(403, "Not allowed: " + error.message)
        );
      });
  }

  deleteKetoPolicy(policyId) {
    return fetch(
      this.ketoUrl.href + "engines/acp/ory/regex/policies/" + policyId,
      {
        headers: this.ketoHeaders,
        method: "DELETE"
      }
    )
      .then(result => {
        return Promise.resolve(result);
      })
      .catch(error => {
        return Promise.reject(
          new DCDError(403, "Not allowed: " + error.message)
        );
      });
  }
}

module.exports = Policies;

const roleToActions = role => {
  switch (role) {
    case "user":
      return ["dcd:actions:create", "dcd:actions:list"];
    case "reader":
      return ["dcd:actions:read", "dcd:actions:list"];
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

const entityToResource = entityId => {
  if (entityId === "dcd") {
    return ["dcd:things", "dcd:persons"];
  }
  return [
    entityId,
    entityId + ":properties",
    entityId + ":properties:<.*>",
    entityId + ":interactions",
    entityId + ":interactions:<.*>"
  ];
};
