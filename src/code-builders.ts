import { kebabCase } from "lodash";
import { nonEmpty, arrToObject } from "./misc";
import * as definedAnnotations from "./annotations";

const beautify = require('beautify');

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
  let config: FieldConfig = { name };
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
 * @param name
 * @param config
 *
 * @returns String representation of property config object
 */
export function buildProperty([name, config]: [string, PolymerPropertyConfig]): string {
  let keyMap = { readonly: "readOnly" };
  let valueMap = "Boolean|Date|Number|String|Array|Object";

  return `${name}:{${
    Object
      .keys(config)
      .filter(key => !!config[ key ])
      .map(key => {
        let value = config[ key ];
        if (key === "type" && valueMap.indexOf(config[ key ]) === -1) {
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
 * @param annotations Class level annotations
 *
 * @returns String representation of polymer component declaration
 */
export function buildPolymerV1({ className, properties, methods, annotations }: {
  className: string;
  properties: FieldConfigMap;
  methods: FieldConfigMap;
  annotations: Array<Decorator>;
}) {
  let observers: Array<string> = [];

  let propertiesMap: Map<string, PolymerPropertyConfig> = new Map();
  properties.forEach((config, name) => {
    if (config.static) {
      return;
    }
    let prop: PolymerPropertyConfig = {
      type: config.type,
      value: config.value,
      readOnly: config.readonly
    };
    if (config.annotations) {
      config.annotations.forEach(({ name, params }) => {
        definedAnnotations[ name ]({ properties, methods, config, prop, params });
      });
    }

    propertiesMap.set(name, prop)
  });

  let methodsMap: FieldConfigMap = new Map();
  methods.forEach((config, name) => {
    let method = Object.assign({}, config);
    if (config.annotations) {
      config.annotations.forEach(({ name, params }) => {
        definedAnnotations[ name ]({ properties, methods, config, method, propertiesMap, observers, params });
      });
    }

    methodsMap.set(name, method);
  });

  let extrasMap: Map<string, any> = new Map();

  annotations.forEach(({ name, params }) => {
    extrasMap.set(name, definedAnnotations[ name ]({ propertiesMap, methodsMap, params }));
  });

  return {
    name: kebabCase(className),
    methodsMap,
    propertiesMap,
    extrasMap,
    src: `Polymer({${[
      `is:"${kebabCase(className)}"`,
      nonEmpty`properties:{${Array.from(propertiesMap).map(buildProperty)}}`,
      nonEmpty`observers:[${observers}]`,
      ...Array.from(methodsMap.values()).map(({ name, body }) => `${name}:function${body}`)
    ]}});`
  };
}

export function buildHTMLModule({ name, extrasMap, src }: {
  name: string;
  methodsMap: FieldConfigMap;
  propertiesMap: Map<string, PolymerPropertyConfig>;
  extrasMap: Map<string, any>;
  src: string;
}) {
  let moduleParts = [];
  if (extrasMap.has("template")) {
    moduleParts.push(`<template>${extrasMap.get("template")}</template>`);
  }
  moduleParts.push("<script>" + beautify(src, { format: "js" }) + "</script>");
  return new Promise((resolve, reject) => {
    resolve({
      name,
      src: beautify(`<dom-module id="${name}">${moduleParts.join("")}</dom-module>`, { format: "html" })
    });
  });
}
