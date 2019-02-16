'use strict';

// Setting the logs
const log4js = require('log4js');
const logger = log4js.getLogger('[dcd-api:lib:grafana]');
logger.level = process.env.LOG_LEVEL || 'INFO';

const fetch = require('node-fetch');

let apiName = "dcd-api";
let apiKey = "";
const password = process.env.GRAFANA_PASSWORD;

/**
 * @returns {Promise<void>}
 */
const getAPIKey = () => {
    const grafanaURL = "http://admin:admin@grafana:3000/api/auth/keys";
    const headers = {
        'Content-Type': 'application/json'
    };
    const body = {
        name: "dcd-api",
        role: "Admin"
    };
    return fetch(grafanaURL, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify(body)
    }).then((result) => {
        apiName = result.name;
        apiKey = result.key;
        return Promise.resolve(true);
    }).catch((error) => {
        logger.debug(error);
        return Promise.reject(error);
    });
};

/**
 * @returns {Promise<void>}
 */
const addUserToOrg = (user, orgId) => {
    const grafanaURL = 'http://admin:' + password
        + '@grafana:3000/api/orgs/'+ orgId +'/users';
    const headers = {
        'Content-Type': 'application/json'
    };
    const body = {
        loginOrEmail: user,
        role: "Editor"
    };
    return fetch(grafanaURL, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify(body)
    }).then((result) => {
        logger.debug(result);
        return Promise.resolve(true);
    }).catch((error) => {
        logger.error(error);
        return Promise.reject(error);
    });
};

/**
 * @returns {Promise<void>}
 */
const updateOrgUserRole = (orgId, userId, role) => {
    const grafanaURL = 'http://admin:' + password
        + '@grafana:3000/api/orgs/'+ orgId +'/users/' + userId;
    const headers = {
        'Content-Type': 'application/json'
    };
    const body = {
        role: role
    };
    return fetch(grafanaURL, {
        headers: headers,
        method: 'PATCH',
        body: JSON.stringify(body)
    }).then((result) => {
        logger.debug(result);
        return Promise.resolve(true);
    }).catch((error) => {
        logger.error(error);
        return Promise.reject(error);
    });
};

/**
 * @returns {Promise<void>}
 */
const createGlobalUser = (person) => {
    const grafanaURL = 'http://admin:' + password
        + '@grafana:3000/api/admin/users';
    const headers = {
        'Content-Type': 'application/json'
    };
    const body = {
        name: person.name,
        email: person.id,
        login: person.id,
        password: person.password
    };
    return fetch(grafanaURL, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify(body)
    }).then((result) => {
        logger.debug(result);
        return Promise.resolve(true);
    }).catch((error) => {
        logger.error(error);
        return Promise.reject(error);
    });
};


exports.getAPIKey = getAPIKey;
exports.addUserToOrg = addUserToOrg;
exports.createGlobalUser = createGlobalUser;
exports.updateOrgUserRole = updateOrgUserRole;