import JSParser from "./parsers/JSParser";
import { kebabCase } from "lodash";
import { nonEmpty } from './helpers/misc';

import * as definedAnnotations from "./annotations";

const beautify = require('beautify');

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

export default class Module extends JSParser {
  constructor(dts: string, js: string, options?: JSParserOptions) {
    super(dts, js, options);
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
  buildPolymerV1() {
    let observers: Array<string> = [];

    let { annotations, methods, properties } = this;

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
      methodsMap,
      propertiesMap,
      extrasMap,
      moduleSrc: `Polymer({${[
        `is:"${kebabCase(this.className)}"`,
        nonEmpty`properties:{${Array.from(propertiesMap).map(buildProperty)}}`,
        nonEmpty`observers:[${observers}]`,
        ...Array.from(methodsMap.values()).map(({ name, body }) => `${name}:function${body}`)
      ]}});`
    };
  }

  toString(polymerVersion = 1) {
    let extrasMap, methodsMap, propertiesMap, moduleSrc;
    if (polymerVersion === 1) {
      ({ extrasMap, methodsMap, propertiesMap, moduleSrc } = this.buildPolymerV1());
    }
    else if (polymerVersion === 2) {
      throw "not yet implemented";
    }
    let moduleParts = [];
    if (extrasMap.has("template")) {
      moduleParts.push(`<template>${extrasMap.get("template")}</template>`);
    }
    moduleParts.push("<script>" + beautify(moduleSrc, { format: "js" }) + "</script>");
    return beautify(`<dom-module id="${kebabCase(this.className)}">${moduleParts.join("")}</dom-module>`, { format: "html" });
  }

  toBuffer(polymerVersion = 1) {
    return new Buffer(this.toString(polymerVersion));
  }
}
