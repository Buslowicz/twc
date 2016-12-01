"use strict";
const lodash_1 = require("lodash");
const misc_1 = require("./misc");
/**
 * Build a full property config
 *
 * @param mods List of field modifiers
 * @param name Property/method name
 * @param params List of parameters (names and types)
 * @param type Type of field
 *
 * @returns Field configuration object
 */
function buildField(mods, name, params, type) {
    let config = { name };
    if (params) {
        config.params = params;
    }
    if (type) {
        config.type = type;
    }
    return Object.assign({}, misc_1.arrToObject(mods), config);
}
exports.buildField = buildField;
/**
 * @todo docs
 */
function buildProperty(prop) {
    let keyMap = { readonly: "readOnly", defaultValue: "value" };
    let valueMap = "Boolean|Date|Number|String|Array|Object";
    let allowedFields = "type|value|reflectToAttribute|readOnly|notify|computed|observer";
    return `${prop.name}: {${Object
        .keys(prop)
        .filter(key => allowedFields.includes(key))
        .map(key => {
        let value = prop[key];
        if (key === "type" && valueMap.indexOf(prop[key]) === -1) {
            value = "Object";
        }
        return `${keyMap[key] || key}: ${value}`;
    })
        .join(",")}}`;
}
exports.buildProperty = buildProperty;
/**
 * Generate a polymer v1 component declaration
 * @todo docs
 */
function buildPolymerV1({ className, properties, methods }) {
    return `Polymer({${[
        `is: "${lodash_1.kebabCase(className)}"`,
        misc_1.nonEmpty `properties: {${properties.filter(prop => !prop.static).map(buildProperty)}}`,
        ...methods.map(method => `${method.name}: function${method.body}`)
    ]}});`;
}
exports.buildPolymerV1 = buildPolymerV1;
//# sourceMappingURL=code-builders.js.map