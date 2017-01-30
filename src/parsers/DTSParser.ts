import { goTo, findClosing, split } from "../helpers/source-crawlers";
import { findDocComment, stripJSDoc, get, type2js } from "../helpers/misc";

import { cloneDeep } from "lodash";

const deprecationNotice = (legacy, native) => `\`${legacy}\` callback is deprecated. Please use \`${native}\` instead`;

export function parseMethodParams(params: string) {
  return params.length === 0 ? [] : split(params, ",", true).map(param => {
      let { 1: pName, 2: pOptional, 3: pType } = param.match(/(?:([\w\d_$]+)(\??))(?:: ?([\W\w]*))?/) || [];
      let paramMeta = { name: pName } as any;
      if (pOptional) {
        paramMeta.isOptional = !!pOptional;
      }
      if (pType) {
        paramMeta.type = pType;
      }
      return paramMeta;
    });
}
export function parseDeclarationBody(body): { methods: Array<BodyItem>; properties: Array<BodyItem> } {
  let methods = [];
  let properties = [];
  let tab = (body.match(/\n(\s+)[\w_$]/) || [])[ 1 ] || "";
  void body.replace(new RegExp(`^${tab}([\\w_$][\\w_$ ]*\\??)(\\:|\\(|\\;)`, "gm"), (_, def, type, index) => {
    let chunks = def.split(" ");
    let name = chunks.pop();
    let comment = findDocComment(body, index);
    let isOptional = name.endsWith("?");
    if (isOptional) {
      name = name.slice(0, -1);
    }
    let itemMeta: BodyItem = { name };
    if (isOptional) {
      itemMeta.isOptional = isOptional;
    }
    if (comment) {
      itemMeta.comment = stripJSDoc(comment);
    }
    chunks.forEach(modifier => itemMeta[ modifier ] = true);
    if (type === "(") {
      methods.push(itemMeta);
    }
    else {
      properties.push(itemMeta);
    }
    switch (type) {
      case ";":
        return _;
      case ":":
        index += tab.length + def.length;
        break;
      case "(":
        let paramsStart = index + _.length;
        let paramsEnd = findClosing(body, paramsStart - 1, "()");
        let params = body.slice(paramsStart, paramsEnd);
        itemMeta.params = parseMethodParams(params);
        index = paramsEnd + 1;
        if (body[ index ] === ";") {
          return _;
        }
        break;
    }
    itemMeta.type = body.slice(index + 1, goTo(body, ";", index)).trim();
    return _;
  });
  return {
    methods, properties
  };
}
export function convertType(descriptor: { type?: string }) {
  let type = type2js(descriptor.type);
  if (type) {
    descriptor.type = type;
  }
  else {
    delete descriptor.type;
  }
}
export default class DTSParser {
  public className: string;
  public parent: string;
  public properties: Map<string, FieldConfig> = new Map();
  public methods: Map<string, FieldConfig> = new Map();
  public events: Map<string, EventInfo> = new Map();

  protected options: JSParserOptions = {
    allowDecorators: false
  };

  constructor(readonly path: string, protected readonly dtsSrc: string, options?: JSParserOptions) {
    Object.assign(this.options, options);

    let meta: Map<string, DefinitionMeta> = new Map();

    (<any> dtsSrc).replace(...this.getDeclarations(meta));

    const metaValues = Array.from(meta.values());

    const instanceOfEvent = parent => [ "Event", "CustomEvent" ].indexOf(parent) !== -1;
    metaValues
      .filter(definition => get(definition, "interface.extends", []).some(instanceOfEvent))
      .forEach(definition => this.events.set(definition.name, {
        name: definition.name,
        comment: definition.interface.comment,
        params: parseDeclarationBody(definition.interface.properties[ 0 ].type).properties.map(prop => ({
          name: prop.name,
          type: prop.type,
          comment: prop.comment
        }))
      }));

    const instanceOfPolymer = parent => [ "Polymer.Element" ].indexOf(parent) !== -1;
    metaValues
      .filter(definition => get(definition, "class.extends", []).some(instanceOfPolymer))
      .forEach(definition => {
        this.className = definition.name;
        this.parent = definition.class.extends[ 0 ];

        definition.class.methods.forEach((method) => {
          let methodDescriptor = <BodyItem & FieldConfig>cloneDeep(method);
          if (methodDescriptor.comment) {
            methodDescriptor.jsDoc = methodDescriptor.comment;
            delete method.comment; // TODO: refactor jsDoc to comment
          }
          convertType(methodDescriptor);
          methodDescriptor.params.forEach(convertType);
          this.methods.set(method.name, methodDescriptor);
        });

        definition.class.properties.forEach((property) => {
          let propertyDescriptor = <BodyItem & FieldConfig>cloneDeep(property);
          if (propertyDescriptor.comment) {
            propertyDescriptor.jsDoc = propertyDescriptor.comment;
            delete property.comment; // TODO: refactor jsDoc to comment
          }
          convertType(propertyDescriptor);
          this.properties.set(property.name, propertyDescriptor);
        });
      });

    /* ********* check for lifecycle methods validity ********* */
    if (this.methods.has("created")) {
      throw new Error(deprecationNotice("created", "constructor"));
    }

    if (this.methods.has("attached")) {
      throw new Error(deprecationNotice("attached", "connectedCallback"));
    }

    if (this.methods.has("detached")) {
      throw new Error(deprecationNotice("detached", "disconnectedCallback"));
    }

    if (this.methods.has("attributeChanged")) {
      throw new Error(deprecationNotice("attributeChanged", "attributeChangedCallback"));
    }
  }

  getDeclarations(collector: Map<string, DefinitionMeta>): Replacer {
    return [
      /(export (default )?)?(declare )?(class|interface) (\w[\d\w_$]+) (?:extends (.*) )?\{(\s*})?$/mg,
      (_, exported, defaultExport, declared, type, name, extend, empty, idx, str) => {
        let index = <any> idx as number;
        let comment = findDocComment(str, index);
        let definition = <DefinitionMeta> { name };
        let bodyStart = index + _.length;
        let bodyEnd = empty ? null : findClosing(str, bodyStart - 1, "{}");
        definition[ type ] = empty ? <any>{} : parseDeclarationBody(str.slice(bodyStart, bodyEnd));
        let definitionDetails = <DefinitionMetaDetails> definition[ type ];
        if (comment) {
          definitionDetails.comment = stripJSDoc(comment);
        }
        if (extend) {
          definitionDetails.extends = extend.split(/\s*,\s*/);
        }
        let obj = collector.get(name);
        if (!obj) {
          collector.set(name, obj = <DefinitionMeta> {});
        }
        Object.assign(obj, definition);
        return _;
      }
    ];
  }
}
