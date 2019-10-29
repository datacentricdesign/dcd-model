/**
 * Generate a short UUID-style random string.
 * @returns {string}
 */
export function uuidShort(): string {
    return 'xxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Generate a valid entity ID out of a string.
 * @param {string} str
 * @returns {string}
 */
export function toID(str): string {
    return (
        str
            .trim()
            .split(' ')
            .join('-')
            .toLowerCase() +
        '-' +
        uuidShort()
    );
}

/**
 * Generate UUID.
 * @returns {string}
 */
export function uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
