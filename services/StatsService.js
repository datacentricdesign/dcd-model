"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:things]");
logger.level = process.env.LOG_LEVEL || "INFO";

class StatsService {

 /**
   *
   * @constructor
   */
  constructor(newModel) {
    this.model = newModel;
  }


  /**
   * Get propertyType stats
   */
    getTypeStats(propertyType,from = undefined, to = undefined){
        return this.model.dao.countPropertyByType(propertyType)
        .catch(error => {
            return Promise.reject(error);
          });
        /*if (from !== undefined && to !== undefined) {
          return this.model.dao.getTypeStats(propertyType, from, to)
            .catch(error => {
            return Promise.reject(error);
          });
        } else {
            from = (new Date(0)).getTime() // first ts
            to = (new Date()).getTime() // now
            return this.model.dao.getTypeStats(propertyType, from, to)
            .catch(error => {
                return Promise.reject(error);
              });
        }*/
    }

}

module.exports = StatsService;