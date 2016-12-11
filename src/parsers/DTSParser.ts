import { goTo, regExpClosestIndexOf, findClosing } from "../helpers/source-crawlers";
import { arrToObject } from '../helpers/misc';

const deprecationNotice = (legacy, native) => `\`${legacy}\` callback is deprecated. Please use \`${native}\` instead`;
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
export function getPropertyNoType(src: string, from: number = 0, to: number = src.indexOf(";")): PropertyConfig {
  let [...modifiers] = src.slice(from, to).split(" ");
  let name = modifiers.pop();
  return { name, modifiers };
}

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
export function getType(src: string, offset: number = 0): FoundType {
  let start = goTo(src, /\S/, offset);
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
        index = findClosing(src, index, "{}");
        start = ++index;
        break;
      case "[":
        types.push(TYPES.ARRAY);
        index = findClosing(src, index, "[]");
        start = ++index;
        break;
      case "<":
        type = src.slice(start, index).trim();
        if (type.length > 0) {
          types.push(type);
        }
        index = findClosing(src, index, "<>");
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

/**
 * Get list of params with their types
 *
 * @param src String to search
 * @param from (Optional) Search from this index
 * @param to (Optional) Search up to this index
 *
 * @returns List of parameter names and types
 */
export function parseParams(src: string, from: number = 0, to: number = src.length): Array<ParamConfig> {
  let params = [];
  while (from < to) {
    let firstStop = regExpClosestIndexOf(src, /,|:/, from);
    if (firstStop.index === -1) {
      params.push({ name: src.slice(from, to).trim() });
      break;
    }
    let param: ParamConfig = { name: src.slice(from, firstStop.index).trim() };

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

/**
 * Build a full property config
 *
 * @param modifiers List of field modifiers
 * @param name Property/method name
 * @param params List of parameters (names and types)
 * @param type Type of field
 *
 * @returns Field configuration object
 */
export function buildFieldConfig(modifiers: Array<string>, name: string, params?: Array<ParamConfig>, type?: string): FieldConfig {
  let config: FieldConfig = { name };
  if (params) {
    config.params = params;
  }
  if (type) {
    config.type = type;
  }
  return Object.assign({}, arrToObject(modifiers), config);
}

export class DTSParser {
  public className: string;
  public parent: string;
  public properties: Map<string, FieldConfig> = new Map();
  public methods: Map<string, FieldConfig> = new Map();

  protected dtsSrc: string;

  protected options: JSParserOptions = {
    allowDecorators: false
  };

  constructor(src: string, options?: JSParserOptions) {
    this.dtsSrc = src;
    Object.assign(this.options, options);

    let match = src.match(/[\s\n]class ([\w$_]+)(?:[\s]+extends ([^{]+))?[\s]*\{/);
    if (!match) {
      throw new Error("no class found");
    }

    this.className = match[ 1 ];
    this.parent = match[ 2 ];

    let start = match.index + match[ 0 ].length;

    for (let ptr = start, end = src.length, char = src.charAt(ptr); ptr < end; char = src.charAt(++ptr)) {
      let params, match;
      // skip whitespace
      let from = ptr = goTo(src, /\S/, ptr);

      // is it the end of class?
      if (src.charAt(from) === "}") {
        break;
      }

      // find next stop (semicolon for the end of line, colon for end of prop name, parenthesis for end of method name
      ({ index: ptr, found: match } = regExpClosestIndexOf(src, /;|:|\(/, ptr));

      // get name and modifiers
      let { name, modifiers } = getPropertyNoType(src, from, ptr);

      // method
      if (match === "(") {
        // find end of parameters declaration
        let end = findClosing(src, ptr, "()");

        // find the colon to start searching for type
        params = parseParams(src, ptr + 1, end);

        let closing = regExpClosestIndexOf(src, /;|:/, end);

        ptr = closing.index + 1;

        if (closing.found === ";") {
          this.methods.set(name, buildFieldConfig(modifiers, name, params));
          continue;
        }
      }
      // no type property
      else if (match === ";") {
        this.properties.set(name, buildFieldConfig(modifiers, name));
        continue;
      }

      let { type, end: typeEnd } = getType(src, ptr + 1);
      ptr = src.indexOf(";", typeEnd);

      if (params) {
        this.methods.set(name, buildFieldConfig(modifiers, name, params, type));
      }
      else {
        this.properties.set(name, buildFieldConfig(modifiers, name, null, type));
      }
    }

    /********** check for lifecycle methods validity **********/
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
}
