"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:things]");
logger.level = process.env.LOG_LEVEL || "INFO";

export class StatsService {
  /**
   *
   * @constructor
   */
  constructor(newModel) {
    this.model = newModel;
  }

  /**
   * Get Global stats
   */
  getGlobalStats() {
    return this.model.dao.getGlobalStats().catch(error => {
      return Promise.reject(error);
    });
  }

  /**
   * Get propertyTypes stats
   */
  getTypesStats(propertyTypes, from = undefined, to = undefined) {
    if (from !== undefined && to !== undefined) {
      return this.model.dao
        .getTypesStats(propertyTypes, from, to)
        .catch(error => {
          return Promise.reject(error);
        });
    } else {
      from = new Date(0).getTime(); // first ts
      to = new Date().getTime(); // now
      return this.model.dao
        .getTypesStats(propertyTypes, from, to)
        .catch(error => {
          return Promise.reject(error);
        });
    }
  }
}
