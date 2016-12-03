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
 * Build a Polymer property config
 *
 * @param prop Property configuration
 *
 * @returns String representation of property config object
 */
export function buildProperty(prop: FieldConfig): string {
  let keyMap = { readonly: "readOnly" };
  let valueMap = "Boolean|Date|Number|String|Array|Object";

  return `${prop.name}:{${
    Object
      .keys(prop)
      .filter(key => key !== "name")
      .map(key => {
        let value = prop[ key ];
        if (key === "type" && valueMap.indexOf(prop[ key ]) === -1) {
          value = "Object";
        }
        return `${keyMap[ key ] || key}:${value}`;
      })
      .join(",")
    }}`;
}

/**
 * Generate a Polymer v1 component declaration
 *
 * @param className Name of the component
 * @param properties Component properties list
 * @param methods Component methods list
 *
 * @returns String representation of polymer component declaration
 */
export function buildPolymerV1(className: string, properties: FieldConfigMap, methods: FieldConfigMap): string {
  return `Polymer({${[
    `is:"${kebabCase(className)}"`,
    nonEmpty`properties:{${Array.from(properties.values()).map(buildProperty)}}`,
    ...Array.from(methods.values()).map(method => `${method.name}:function${method.body}`)
  ]}});`;
}
