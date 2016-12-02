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
 * Build a Polymer property config
 *
 * @param prop Property configuration
 *
 * @returns String representation of property config object
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
 * Generate a Polymer v1 component declaration
 *
 * @param className Name of the component
 * @param properties Component properties list
 * @param methods Component methods list
 *
 * @returns String representation of polymer component declaration
 */
function buildPolymerV1(className, properties, methods) {
    return `Polymer({${[
        `is: "${lodash_1.kebabCase(className)}"`,
        misc_1.nonEmpty `properties: {${Array.from(properties.values()).filter(prop => !prop.static).map(buildProperty)}}`,
        ...Array.from(methods.values()).map(method => `${method.name}: function${method.body}`)
    ]}});`;
}
exports.buildPolymerV1 = buildPolymerV1;
//# sourceMappingURL=code-builders.js.map