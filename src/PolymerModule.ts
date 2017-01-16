import { kebabCase } from "lodash";
import { join } from "path";
import { nonEmpty } from "./helpers/misc";
import JSParser from "./parsers/JSParser";
import { html_beautify as beautify } from "js-beautify";

import * as definedAnnotations from "./annotations";
import { readFileSync } from "fs";
import { parse } from "path";

export function formatJsDoc(doc: string | null | undefined): string {
  return doc ? "/**\n" + doc.split("\n").map(line => ` * ${line}`).join("\n") + "\n */\n" : "";
}

/**
 * Build a Polymer property config
 *
 * @param name
 * @param config
 *
 * @returns String representation of property config object
 */
export function buildProperty([ name, config ]: [ string, PolymerPropertyConfig ]): string {
  let valueMap = "Boolean|Date|Number|String|Array|Object";

  return `${formatJsDoc(config.jsDoc)}${name}:{${
    Object
      .keys(config)
      .filter(key => !!config[ key ] && key !== "jsDoc")
      .map(key => {
        let value = config[ key ];
        if (key === "type" && valueMap.indexOf(config[ key ]) === -1) {
          value = "Object";
        }
        return `${key}:${value}`;
      })
      .join(",")
    }}`;
}

export function buildPropertiesMap(properties: FieldConfigMap,
                                   methods: FieldConfigMap,
                                   isES6: boolean = false): Map<string, PolymerPropertyConfig> {
  let propertiesMap: Map<string, PolymerPropertyConfig> = new Map();
  properties.forEach((config, propName) => {
    if (config.static || config.private) {
      return;
    }

    let prop: PolymerPropertyConfig = {
      type: config.type
    };

    if (config.value) {
      if (config.isPrimitive) {
        prop.value = config.value;
      }
      else {
        prop.value = isES6 ? `() => ${config.value}` : `function() { return ${config.value}; }`;
      }
    }
    if (config.readonly) {
      prop.readOnly = config.readonly;
    }
    if (config.jsDoc) {
      prop.jsDoc = config.jsDoc;
    }
    if (config.annotations) {
      config.annotations.forEach(({ name, params }) => {
        definedAnnotations[ name ]({ properties, methods, config, prop, params });
      });
    }

    propertiesMap.set(propName, prop);
  });
  return propertiesMap;
}

export function buildMethodsMap(methods: FieldConfigMap,
                                properties: FieldConfigMap,
                                propertiesMap: Map<string, PolymerPropertyConfig>,
                                observers: Array<string>): FieldConfigMap {
  let methodsMap: FieldConfigMap = new Map();
  methods.forEach((config, methodName) => {
    let method = Object.assign({}, config);
    if (config.annotations) {
      config.annotations.forEach(({ name, params }) => {
        definedAnnotations[ name ]({ properties, methods, config, method, propertiesMap, observers, params });
      });
    }

    methodsMap.set(methodName, method);
  });
  return methodsMap;
}

export default class Module extends JSParser {
  constructor(path: string, dts: string, js: string, options?: JSParserOptions) {
    super(path, dts, js, options);
  }

  /**
   * Generate a Polymer v1 component declaration
   *
   * @returns String representation of polymer component declaration
   */
  buildPolymerV1(): {
    meta: Map<string, any>;
    src: string;
  } {
    let observers: Array<string> = [];
    let behaviors: Array<string> = [];
    let styles: Array<{ type: "link"|"shared"|"inline", style: string }> = [];

    let { annotations, methods, properties } = this;

    let propertiesMap = buildPropertiesMap(properties, methods, this.isES6);
    let methodsMap = buildMethodsMap(methods, properties, propertiesMap, observers);

    let meta = new Map<string, any>([
      [ "styles", styles ],
      [ "properties", propertiesMap ],
      [ "methods", methodsMap ]
    ]);

    annotations.forEach(({ name, params }) => {
      let annotation = definedAnnotations[ name ]({ propertiesMap, methodsMap, params, styles, behaviors });
      if (annotation !== undefined) {
        meta.set(name, annotation);
      }
    });

    const v1ToV0LifeCycles = {
      constructor: "created",
      connectedCallback: "attached",
      disconnectedCallback: "detached",
      attributeChangedCallback: "attributeChanged"
    };

    let helperName = this.helperClassName ? ` = ${this.helperClassName}` : "";

    const filterEmpty = chunk => !!chunk;

    return {
      meta, src: [
        `${this.isES6 ? "const" : "var"} ${this.className}${helperName} = Polymer({`,
        ...Array.from(this.events.values()).map(event => {
          return [
            "/**",
            ...(event.description ? [
                ` * ${event.description}`,
                ` *`
              ] : []),
            ` * @event ${kebabCase(event.name)}`,
            ...event.params.map(({ type, name, description }) => {
              let parsedType = type.replace(/\s+/g, " ").replace(/(.+?:.+?);/g, "$1,");
              return ` * @param {${parsedType}} ${name}${description ? ` ${description}` : ""}`;
            }),
            " */"
          ].join("\n");
        }),
        [
          `is:"${kebabCase(this.className)}"`,
          nonEmpty`properties:{${Array.from(propertiesMap).map(buildProperty)}}`,
          nonEmpty`observers:[${observers}]`,
          nonEmpty`behaviors:[${behaviors}]`,
          ...Array.from(methodsMap.values()).filter(config => !config.static).map(({ name, body, jsDoc }) => {
            if (name === "constructor") {
              body = body
                .replace(/(?:\n[\s]*)?super\(.*?\);/, "")
                .replace(/var _this = _super\.call\(this(?:.*?)\) \|\| this;/, "var _this = this;");
            }
            return `${formatJsDoc(jsDoc)}${v1ToV0LifeCycles[ name ] || name}:function${body}`;
          })
        ].filter(filterEmpty).join(","),
        `});`,
        ...Array.from(methodsMap.values()).filter(config => config.static).map(({ name, body, jsDoc }) => {
          return `${formatJsDoc(jsDoc)}${this.className}.${v1ToV0LifeCycles[ name ] || name} = function${body};`;
        })
      ].filter(filterEmpty).join("\n")
    };
  }

  toString(polymerVersion = 1) {
    let meta: Map<string, any>;
    let src: string;

    if (polymerVersion === 1) {
      ({ meta, src } = this.buildPolymerV1());
    }
    else if (polymerVersion === 2) {
      throw "Polymer 2 output is not yet implemented. For more info see https://github.com/Draccoz/twc/issues/16";
    }

    let { dir } = parse(this.path);
    let styles = meta.get("styles");
    let tpl = (({ template, type } = {}) => {
      switch (type) {
        case "link":
          return readFileSync(join(dir, template)).toString();
        case "inline":
          return template;
        default:
          return "";
      }
    })(meta.get("template"));

    return beautify([
      ...this.links.map(module => `<link rel="import" href="${module}">`),
      ...this.scripts.map(module => `<script src="${module}"></script>`),

      nonEmpty`<!--\n${this.jsDoc}\n-->`,
      `<dom-module id="${kebabCase(this.className)}">${[
        nonEmpty`\n<template>${[
          ...styles.map(({ style, type }) => {
            switch (type) {
              case "link":
                return `<style\>${readFileSync(join(dir, style))}</style>`;
              case "inline":
                if (!this.isES6) {
                  style = style.replace(/\\n/g, "\n").replace(/\\"/g, '"');
                }
                return `<style\>${style}</style>`;
              case "shared":
                return `<style include="${style}"></style>`;
            }
          }),
          this.isES6 ? tpl : tpl.replace(/\\n/g, "\n").replace(/\\"/g, '"')
        ].join("\n")}</template>`,
        `<script\>${([
          "(function () {",
          this.jsSrc.slice(0, this.classBodyPosition.start),
          src,
          this.jsSrc.slice(this.classBodyPosition.end + 1),
          "}());"
        ].join("\n"))}</script>`
      ].join("\n")}</dom-module>`
    ].join("\n"), { max_preserve_newlines: 2, end_with_newline: true });
  }

  toBuffer(polymerVersion = 1) {
    return new Buffer(this.toString(polymerVersion));
  }
}
