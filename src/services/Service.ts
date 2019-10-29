'use strict';

import { DCDModel } from '../index';
import { Policies } from '../lib/policies';

// Setting the logs
import log4js = require('log4js');

/**
 *
 */
export class Service {
    protected model: DCDModel;
    protected logger: log4js.Logger;
    policies: Policies;
    /**
     *
     * @constructor
     */
    constructor(newModel) {
        this.model = newModel;
        this.policies = new Policies(newModel);
        this.logger = log4js.getLogger(`[dcd:${this.constructor.name}]`);
        this.logger.level = process.env.LOG_LEVEL || 'INFO';
    }
}

export interface CreationReport {
    received: number;
    stored: number;
    duplicates: number;
    malformed: number;
    timestampAdded: number;
}

export interface DeletionReport {
    received: number;
    deleted: number;
}
