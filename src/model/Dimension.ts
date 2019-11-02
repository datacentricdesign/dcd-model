'use strict';

export class Dimension {
    name: string;
    description: string;
    unit: string;
    /**
     * @constructor
     */
    constructor(name, description, unit) {
        this.name = name !== undefined ? name : '';
        this.description = description !== undefined ? description : '';
        this.unit = unit !== undefined ? unit : '';
    }
}

export interface JSONDimension {
    name: string;
    description: string;
    unit: string;
}
