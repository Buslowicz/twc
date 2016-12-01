import { kebabCase } from "lodash";
import { nonEmpty, arrToObject } from "./misc";

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
export function buildField(mods: Array<string>, name: string, params?: Array<ParamConfig>, type?: string): FieldConfig {
  let config: {name: string, params?: Array<ParamConfig>, type?: string} = { name };
  if (params) {
    config.params = params;
  }
  if (type) {
    config.type = type;
  }
  return Object.assign({}, arrToObject(mods), config);
}

/**
 * @todo docs
 */
export function buildProperty(prop) {
  let keyMap = { readonly: "readOnly", defaultValue: "value" };
  let valueMap = "Boolean|Date|Number|String|Array|Object";
  let allowedFields = "type|value|reflectToAttribute|readOnly|notify|computed|observer";

  return `${prop.name}: {${Object
    .keys(prop)
    .filter(key => allowedFields.includes(key))
    .map(key => {
      let value = prop[ key ];
      if (key === "type" && valueMap.indexOf(prop[ key ]) === -1) {
        value = "Object";
      }
      return `${keyMap[ key ] || key}: ${value}`;
    })
    .join(",")}}`;
}

/**
 * Generate a polymer v1 component declaration
 * @todo docs
 */
export function buildPolymerV1({ className, properties, methods }) {
  return `Polymer({${[
    `is: "${kebabCase(className)}"`,
    nonEmpty`properties: {${properties.filter(prop => !prop.static).map(buildProperty)}}`,
    ...methods.map(method => `${method.name}: function${method.body}`)
  ]}});`;
}
