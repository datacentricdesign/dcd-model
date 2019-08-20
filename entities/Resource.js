"use strict";

const idGen = require("../lib/id");

class Resource {

    constructor(task_id,subjectEntityId, milestones = [],id = undefined){
        this.id = id !== undefined ? id : idGen.uuidv4();
        this.taskId = task_id
        this.subjectEntityId = subjectEntityId
        this.readAt = Date.now();
        this.milestones = milestones
    }

 /**
   * @param {Array[]} milestones
   */
  addMilestone(milestones) {
    this.values = this.milestones.concat(milestones);
  }
}

module.exports = Resource;
