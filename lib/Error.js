"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd-model:lib:error]");
logger.level = process.env.LOG_LEVEL || "INFO";

/**
 * This class help built complete error messages.
 * @param {int} code
 * @param {string} message
 */
class DCDError {
  constructor(code, hint) {
    this.code = code;
    if (hint !== undefined) {
      this.hint = hint;
    }
    this.requirements = "";

    switch (code) {
      case 400:
        this.status = 400;
        this.message = "Information missing or malformed";
        this.requirements =
          "Something is missing or malformed in body, query params or path params.";
        break;
      case 4001:
        this.status = 400;
        this.message = "Person information missing or malformed";
        this.requirements =
          "Person information must be provided in JSON format and includes fields id, name and password.\n The password must be at least 8-character long.";
        break;
      case 4002:
        this.status = 400;
        this.message = "Person already existing";
        this.requirements = "Person id must be unique.";
        break;
      case 4003:
        this.status = 400;
        this.message = "Thing information missing or malformed";
        this.requirements =
          "Thing information must be provided in JSON format and includes fields name and type.";
        break;
      case 4004:
        this.status = 400;
        this.message = "Thing already existing";
        this.requirements = "Thing id must be unique.";
        break;
      case 4006:
        this.status = 400;
        this.message = "DB duplicated entry";
        break;
      case 4007:
        this.status = 400;
        this.message = "Property information missing or malformed";
        this.requirements =
          "Property information must be provided in JSON format and includes fields name and type.";
        break;
      case 4008:
        this.status = 400;
        this.message = "Interaction information missing or malformed";
        break;
      case 4009:
        this.status = 400;
        this.message = "Class information missing or malformed";
        break;
      case 4031:
        this.status = 403;
        this.message =
          "Access denied - Authentication information missing, malformed or invalid";
        this.requirements = "You must provide a valid bearer token.";
        break;
      case 404:
        this.status = 404;
        this.message = "Resource not found";
        break;
      case 4041:
        this.status = 404;
        this.message = "Role not found";
        break;
      default:
        this.code = 500;
        this.status = 500;
        this.message = "Server error";
    }
  }
}

module.exports = DCDError;
