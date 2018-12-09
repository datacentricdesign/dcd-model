
/**
 * Generate a valid entity ID out of a string.
 * @param {string} str
 * @returns {string}
 */
function toID(str) {
    return str.trim().split(' ').join('-').toLowerCase()
        + '-' + uuidShort();
}

exports.toID = toID;

/**
 * Generate UUID.
 * @returns {string}
 */
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}

exports.uuidv4 = uuidv4;




/**
 * Generate a short UUID-style random string.
 * @returns {string}
 */
function uuidShort() {
    return 'xxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x'
            ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

exports.uuidShort = uuidShort;