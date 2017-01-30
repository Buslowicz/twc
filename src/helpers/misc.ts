import { split } from "./source-crawlers";
/**
 * Convert array to object, using given value (default `true`) as value
 *
 * @param arr Array of strings to convert
 * @param value Value to assign to keys
 *
 * @returns An object with array values as keys and given value as object values
 */
export function arrToObject(arr: Array<string>, value: any = true): any {
  let obj = {};
  for (let i = 0, l = arr.length; i < l; i++) {
    obj[ arr[ i ] ] = value;
  }
  return obj;
}

export function get(obj, path, fallback) {
  let chunks = path.split(".");
  for (let i = 0, l = chunks.length; i < l; i++) {
    obj = obj[chunks[i]];
    if (!obj) {
      return fallback;
    }
  }
  return obj;
}

/**
 * Template string tag to return empty string if param is an empty array
 *
 * @param stringsArray List of template string constants
 * @param param List of params passed to template string
 *
 * @returns Built template string or empty string if params list is empty
 */
export function nonEmpty(stringsArray: TemplateStringsArray, param: Array<string>|string): string {
  if (!param || param.length === 0) {
    return null;
  }
  return stringsArray[ 0 ] + param + stringsArray[ 1 ];
}

export function stripJSDoc(doc) {
  return doc
    .slice(3, -2)
    .trim()
    .split("\n")
    .map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith("*")) {
          return trimmedLine.substr(1).trim();
        }
        else {
          return trimmedLine;
        }
      }
    )
    .join("\n");
}

export function wrapJSDoc(doc) {
  return ["/**"]
    .concat(doc
      .split("\n")
      .map(line => line.length > 0 ? ` * ${line}` : " *")
    )
    .concat(" */")
    .join("\n");
}

export function findDocComment(str, i): string | undefined {
  let commentStart = -1, commentEnd;
  while (--i >= 0) {
    if (/\s/.test(str[ i ])) {
      continue;
    }
    if (str[ i ] === "/" && str[ i - 1 ] === "*") {
      commentEnd = i--;
      break;
    }
    return undefined;
  }
  while (--i >= 0) {
    if (str[ i - 2 ] === "/" && str[ i - 1 ] === "*" && str[ i ] === "*") {
      commentStart = i - 2;
      break;
    }
  }
  return str.slice(commentStart, commentEnd + 1);
}

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
 * @todo parse arrow functions
 */
export function type2js(type) {
  if (!type) {
    return null;
  }

  let types = split(type, /&|\|/, true);

  type = types.reduce((previous, current) => {
    if (TYPES.IS_IGNORED(current)) {
      return previous;
    }
    if (TYPES.IS_PRIMITIVE(current)) {
      current = `${current.charAt(0).toUpperCase()}${current.substr(1)}`;
    }
    if (current.startsWith("Array") || current.endsWith("[]") || /^\[[\W\w]*]$/.test(current)) {
      current = TYPES.ARRAY;
    }
    if (/^\{[\W\w]*}$/.test(current)) {
      current = TYPES.OBJECT;
    }
    if (/^['"`][\W\w]*['"`]$/.test(current)) {
      current = TYPES.STRING;
    }
    let indexOfGeneric = current.indexOf("<");
    if (indexOfGeneric !== -1) {
      current = current.slice(0, indexOfGeneric);
    }
    if (previous && (previous !== current)) {
      return TYPES.OBJECT;
    }
    return current;
  }, null);
  if (TYPES.IS_PRIMITIVE(type)) {
    type = `${type.charAt(0).toUpperCase()}${type.substr(1)}`;
  }
  return type;
}
