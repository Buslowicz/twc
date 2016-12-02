"use strict";
/**
 * Convert array to object, using given value (default `true`) as value
 *
 * @param arr Array of strings to convert
 * @param value Value to assign to keys
 *
 * @returns An object with array values as keys and given value as object values
 */
function arrToObject(arr, value = true) {
    let obj = {};
    for (let i = 0, l = arr.length; i < l; i++) {
        obj[arr[i]] = value;
    }
    return obj;
}
exports.arrToObject = arrToObject;
/**
 * Template string tag to return empty string if param is an empty array
 *
 * @param stringsArray List of template string constants
 * @param param List of params passed to template string
 *
 * @returns Built template string or empty string if params list is empty
 */
function nonEmpty(stringsArray, param) {
    if (param.length) {
        return "";
    }
    return stringsArray[0] + param + stringsArray[1];
}
exports.nonEmpty = nonEmpty;
//# sourceMappingURL=misc.js.map