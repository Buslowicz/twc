"use strict";
const source_crawlers_1 = require('./source-crawlers');
const TYPES = {
    IS_PRIMITIVE: type => "boolean|number|string|object".indexOf(type) !== -1,
    IS_IGNORED: type => "void|null|undefined|never".indexOf(type) !== -1,
    BOOLEAN: "Boolean",
    NUMBER: "Number",
    STRING: "String",
    DATE: "Date",
    OBJECT: "Object",
    ARRAY: "Array"
};
/**
 * Get modifiers and name of a property or method (does not get types)
 *
 * @param src String to search
 * @param from (Optional) Search from this index
 * @param to (Optional) Search up to this index
 *
 * @returns name and array of property/method modifiers
 */
function getPropertyNoType(src, from = 0, to = src.indexOf(";")) {
    let [...modifiers] = src.slice(from, to).split(" ");
    let name = modifiers.pop();
    return { name, modifiers };
}
exports.getPropertyNoType = getPropertyNoType;
/**
 * Get type of property, method or param. Inline structures are casted to Object or Array.
 * Combined types are casted to Object. Generic types are stripped.
 *
 * @fixme function interface type ( () => void; )
 *
 * @param src String to search
 * @param offset (Optional) Search offset
 *
 * @returns Found type and index of the END of type declaration or null and -1 if not found
 */
function getType(src, offset = 0) {
    let start = source_crawlers_1.goTo(src, /\S/, offset);
    let done = false;
    let index = start;
    let types = [];
    let char;
    let type;
    while (!done && (char = src.charAt(index))) {
        switch (char) {
            case ")":
            case ",":
            case ";":
                type = src.slice(start, index).trim();
                if (type.length > 0) {
                    types.push(type);
                }
                done = true;
                break;
            case "{":
                types.push(TYPES.OBJECT);
                index = source_crawlers_1.findClosing(src, index, "{}");
                start = ++index;
                break;
            case "[":
                types.push(TYPES.ARRAY);
                index = source_crawlers_1.findClosing(src, index, "[]");
                start = ++index;
                break;
            case "<":
                type = src.slice(start, index).trim();
                if (type.length > 0) {
                    types.push(type);
                }
                index = source_crawlers_1.findClosing(src, index, "<>");
                if (index === -1) {
                    return { type: null, end: -1 };
                }
                start = ++index;
                break;
            case "\"":
                types.push(TYPES.STRING);
                index = src.indexOf("\"", index + 1);
                start = ++index;
                break;
            case "|":
            case "&":
                type = src.slice(start, index).trim();
                start = ++index;
                if (type.length > 0) {
                    types.push(type);
                }
                break;
            case "":
                return { type: null, end: -1 };
            default:
                index++;
        }
    }
    type = types.reduce((type, result) => {
        if (result === TYPES.OBJECT || !type) {
            return result;
        }
        if (TYPES.IS_IGNORED(result)) {
            return type;
        }
        if (result !== type) {
            return TYPES.OBJECT;
        }
        return type;
    }, null);
    if (TYPES.IS_PRIMITIVE(type)) {
        type = `${type.charAt(0).toUpperCase()}${type.substr(1)}`;
    }
    return { type, end: index };
}
exports.getType = getType;
/**
 * Get list of params with their types
 *
 * @param src String to search
 * @param from (Optional) Search from this index
 * @param to (Optional) Search up to this index
 *
 * @returns List of parameter names and types
 */
function parseParams(src, from = 0, to = src.length) {
    let params = [];
    while (from < to) {
        let firstStop = source_crawlers_1.regExpClosestIndexOf(src, /,|:/, from);
        if (firstStop.index === -1) {
            params.push({ name: src.slice(from, to).trim() });
            break;
        }
        let param = { name: src.slice(from, firstStop.index).trim() };
        if (firstStop.found === ":") {
            let { type, end } = getType(src, firstStop.index + 1);
            if (type) {
                param.type = type;
            }
            from = end + 1;
        }
        else {
            from = firstStop.index + 1;
        }
        params.push(param);
    }
    return params;
}
exports.parseParams = parseParams;
//# sourceMappingURL=ts-parsers.js.map