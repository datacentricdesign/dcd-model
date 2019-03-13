'use strict';

class Class {

    /**
     * @constructor
     */
    constructor(name, value, dimensionId = undefined, description = "") {
        if (typeof name === 'object') {
            const json = name;
            this.name = json.name;
            this.value = json.value;
            this.dimensionId = json.dimensionId;
            this.description = json.description;
        } else {
            this.name = name;
            this.value = value;
            this.dimensionId = dimensionId;
            this.description = description;
        }
    }

}

module.exports = Dimension;