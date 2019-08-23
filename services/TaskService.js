"use strict";

// Setting the logs
const log4js = require("log4js");
const logger = log4js.getLogger("[dcd:tasks]");
logger.level = process.env.LOG_LEVEL || "INFO";

class TaskService {
  /**
   *
   * @constructor
   */
  constructor(newModel) {
    this.model = newModel;
  }

  /**
   * Create a Task
   * @param {Task} task 
   * @returns {Object} Task
   */
  create(task){
    return this.model.dao
    .createTask(task)
    .then(()=>{
        return this.model.dao.createResources(task)
    })
    .then(()=>{
        return Promise.resolve(task); 
    })
    .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   * List some Tasks.
   * @param {string} personId
   * @returns {Object} {actor_tasks : Task[] & subject_tasks : Task[]}
   **/
  list(personId) {
    return this.model.dao.listTasks(personId);
  }

 /**
   * Read a Task.
   * @param {string} taskId
   * @returns {Object} Task
   **/
  read(taskId) {
    return this.model.dao
      .readTask(taskId)
      .then(task => {
        return Promise.resolve(task)
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  /**
   * Delete a Task
   * @param {string} taskId 
   * @param {string} actorId
   */
  del(taskId,actorId){
    return this.dao.deleteTask(taskId,actorId)
  }

  /**
   * Read a Task resources
   * @param {string} taskId 
   * @param {string} personId 
   * @param {boolean} actor
   * @returns {Object} Resources[]
   */
  readResources(taskId,personId,actor){
    if(actor){
      return this.model.dao.readActorResources(taskId,personId)
    }else{
      return this.model.dao.readSubjectResources(taskId,personId)
    }
  }

  /**
   * Add a milestone to a resource of a task
   * @param {Object} milestone 
   * @param {string} subjectId 
   */
  addMilestone(milestone,subjectId){
    return this.model.dao.checkSubject(milestone.resource_id,subjectId)
    .then(() => {
      return this.model.dao.addMilestone(milestone)
    })
    .catch(error => {
      return Promise.reject(error);
    });
  }

}

module.exports = TaskService;