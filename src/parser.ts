export interface Param {
  name: string;
  type?: string
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

const OBJECT_BRACKETS = "{}";
const ARRAY_BRACKETS = "[]";
const GENERIC_BRACKETS = "<>";
const ROUND_BRACKETS = "()";

export function goTo(src, term, index = 0) {
  let char;
  let prevChar = null;
  let checkRegExp = typeof term !== "string";
  let stringOpen = false;

  function openString(char, prevChar) {
    if (prevChar === "\\") {
      return;
    }
    if (stringOpen === char) {
      stringOpen = false;
    }
    else if (stringOpen === false) {
      stringOpen = char;
    }
  }

  while ((char = src.charAt(index))) {
    if (!stringOpen && (checkRegExp && term.test(char) || char === term)) {
      return index;
    }
    switch (char) {
      case "{":
        index = findClosing(src, index, OBJECT_BRACKETS);
        break;
      case "[":
        index = findClosing(src, index, ARRAY_BRACKETS);
        break;
      case "<":
        index = findClosing(src, index, GENERIC_BRACKETS);
        break;
      case "(":
        index = findClosing(src, index, ROUND_BRACKETS);
        break;
      case "'":
        openString(char, prevChar);
        break;
      case "`":
        openString(char, prevChar);
        break;
      case `"`:
        openString(char, prevChar);
        break;
    }
    prevChar = char;
    index++;
  }
  return -1;
}

export function split(src, term, trim = false) {
  let start = 0;
  let chunks = [];
  do {
    let comma = goTo(src, term, start);
    let chunk = comma === -1 ? src.substr(start) : src.slice(start, comma);
    chunks.push(trim ? chunk.trim() : chunk);
    start = comma + 1;
  }
  while (start > 0);
  return chunks;
}

export function findClosing(src, ptr, brackets) {
  let start = ptr;
  let opened = 1;
  let char;
  while ((char = src.charAt(++ptr))) {
    switch (char) {
      case brackets[ 0 ]:
        opened++;
        break;
      case brackets[ 1 ]:
        opened--;
        if (opened <= 0) {
          return ptr;
        }
        break;
    }
  }
  let line = 1;
  for (let i = 0, l = start; i < l; i++) {
    if (/\n/.test(src.charAt(i))) {
      line++;
    }
  }
  throw new SyntaxError(`Parenthesis has no closing at line ${line}.`);
}

export function regExpClosestIndexOf(src, index = 0, chars = /;|:|\(/) {
  let char;
  while ((char = src.charAt(index))) {
    let match = char.match(chars);
    if (!match) {
      index++;
      continue;
    }
    return { index, found: match[ 0 ] };
  }
  return { index: -1, found: null };
}

export function regExpIndexOf(src, ptr, match = /\S/) {
  let char;
  while ((char = src.charAt(ptr))) {
    if (match.test(char)) {
      return ptr;
    }
    ptr++;
  }
  return -1;
}

export function getPropertyNoType(src, from?, to?) {
  let [...modifiers] = src.slice(from || 0, to ? to : src.indexOf(";")).split(" ");
  let name = modifiers.pop();
  return { name, modifiers };
}

export function getType(src, from = 0) {
  // FIXME function interface type ( () => void; )
  // TODO change loop to use goTo function ?
  let start = regExpIndexOf(src, from);
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
        index = findClosing(src, index, OBJECT_BRACKETS);
        start = ++index;
        break;
      case "[":
        types.push(TYPES.ARRAY);
        index = findClosing(src, index, ARRAY_BRACKETS);
        start = ++index;
        break;
      case "<":
        type = src.slice(start, index).trim();
        if (type.length > 0) {
          types.push(type);
        }
        index = findClosing(src, index, GENERIC_BRACKETS);
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
        return null;
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

export function arrToObject(arr, value: any = true) {
  let obj = {};
  for (let i = 0, l = arr.length; i < l; i++) {
    obj[ arr[ i ] ] = value;
  }
  return obj;
}

export function parseParams(src, from = 0, to = src.length) {
  let params = [];
  while (from < to) {
    let firstStop = regExpClosestIndexOf(src, from, /,|:/);
    if (firstStop.index === -1) {
      params.push({ name: src.slice(from, to).trim() });
      break;
    }
    let param: Param = { name: src.slice(from, firstStop.index).trim() };

    if (firstStop.found === ":") {
      let typeData = getType(src, firstStop.index + 1);
      if (typeData.type) {
        param.type = typeData.type;
      }
      from = typeData.end + 1;
    }
    else {
      from = firstStop.index + 1;
    }

    params.push(param);
  }

  return params;
}

export function buildField(modifiers, name, params?, type?) {
  let config: {name: string, params?: Array<Param>, type?: string} = { name };
  if (params) {
    config.params = params;
  }
  if (type) {
    config.type = type;
  }
  return Object.assign({}, arrToObject(modifiers), config);
}

export function getParamsData(src, ptr = 0) {
  let closeIndex = findClosing(src, ptr, ROUND_BRACKETS);

  // find the colon to start searching for type
  let params = parseParams(src, ptr + 1, closeIndex);
  return { closeIndex, params };
}

export function parseDTS(src) {
  let match = src.match(/[\s\n]class ([\w$_]+)(?:[\s]+extends ([^{]+))?[\s]*\{/);
  if (!match) {
    throw new Error("no class found");
  }

  const className = match[ 1 ];
  const parent = match[ 2 ];

  const properties = [];
  const methods = [];

  let start = match.index + match[ 0 ].length;

  for (
    // predefining
    let ptr = start, end = src.length, char = src.charAt(ptr);
    // condition
    ptr < end;
    // post-actions
    char = src.charAt(++ptr)
  ) {
    let params, match, decorator;
    // skip whitespace
    let from = ptr = regExpIndexOf(src, ptr);

    // is it the end of class?
    if (src.charAt(from) === "}") {
      break;
    }

    // find next stop (semicolon for the end of line, colon for end of prop name, parenthesis for end of method name
    ({ index: ptr, found: match } = regExpClosestIndexOf(src, ptr));

    // get name and modifiers
    let { name, modifiers } = getPropertyNoType(src, from, ptr);

    // method
    if (match === "(") {
      // find end of parameters declaration
      let closeIndex;
      ({ params, closeIndex } = getParamsData(src, ptr));

      let closing = regExpClosestIndexOf(src, closeIndex, /;|:/);

      ptr = closing.index + 1;

      if (closing.found === ";") {
        methods.push(buildField(modifiers, name, params));
        continue;
      }
    }
    // no type property
    else if (match === ";") {
      properties.push(buildField(modifiers, name));
      continue;
    }

    let { type, end: typeEnd } = getType(src, ptr + 1);
    ptr = src.indexOf(";", typeEnd);

    if (params) {
      methods.push(buildField(modifiers, name, params, type));
    }
    else {
      properties.push(buildField(modifiers, name, null, type));
    }
  }

  return { className, parent, properties, methods };
}

export function parseJS(src, { className, properties }, { definedAnnotations = [] } = {}) {
  // TODO Remove default values (as an option) ??
  const constructorPattern = new RegExp(`(class|function)[\\s]*${className}.*?{`);
  const defaultValuePattern = new RegExp(`this\\.(${properties.map(itm => itm.name).join("|")}) = (.*);\\n`, "g");
  const fieldDecoratorPattern = new RegExp(`__decorate\\(\\[([\\W\\w]*?)], (${className}\\.prototype), "(.*?)", (.*?)\\);`, "g");
  const classDecoratorPattern = new RegExp(`${className} = (?:(.*?) = )?__decorate\\(\\[([\\W\\w]*?)], (${className})\\);`, "g");

  let { index = -1, 1: match = null } = src.match(constructorPattern) || {};

  if (!match) {
    throw new Error ("no class found");
  }

  // find constructor if es6 class was found
  if (match === "class") {
    index = src.indexOf("constructor", index);
  }

  // find beginning of the constructor body
  index = src.indexOf("{", index);

  // find closing of the constructor body
  let end = findClosing(src, index, OBJECT_BRACKETS);

  let values = {};
  let decorators = {};
  let annotations = {};
  let generatedName;

  // get default values
  src.slice(index + 1, end).replace(defaultValuePattern, (_, name, value) => values[ name ] = value);

  // find where decorators meta start
  let decorStart = src.indexOf("__decorate([", end);
  let decoratorsSrc = src.substr(decorStart);

  // get decorators
  decoratorsSrc.replace(fieldDecoratorPattern, (_, definition, proto, name, descriptor) => {
    let usedDecorators = [];
    let usedAnnotations = [];

    definition = definition.trim();

    // get each decorator name and execution params
    for (let decors = split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
      let decor = decors[ i ];
      let ptr = decor.indexOf("(");
      let [name, params = undefined] = ptr !== -1 ? [ decor.slice(0, ptr), decor.slice(ptr + 1, decor.length - 1) ] : [ decor ];
      if (definedAnnotations.indexOf(name) !== -1) {
        usedAnnotations.push({ name, params, descriptor });
      }
      else {
        usedDecorators.push(name);
      }
    }

    decorators[ name ] = usedDecorators;
    annotations[ name ] = usedAnnotations;

    //    return `__decorate(${definition}), ${proto}, "${name}", ${descriptor});`
  });

  decoratorsSrc.replace(classDecoratorPattern, (_, secondName, definition) => {
    generatedName = secondName;

    let usedDecorators = [];
    let usedAnnotations = [];

    definition = definition.trim();

    // get each decorator name and execution params
    for (let decors = split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
      let decor = decors[ i ];
      let ptr = decor.indexOf("(");
      let [name, params = undefined] = ptr !== -1 ? [ decor.slice(0, ptr), decor.slice(ptr + 1, decor.length - 1) ] : [ decor ];
      if (definedAnnotations.indexOf(name) !== -1) {
        usedAnnotations.push({ name, params });
      }
      else {
        usedDecorators.push(name);
      }
    }

    decorators[ "class" ] = usedDecorators;
    annotations[ "class" ] = usedAnnotations;
  });

  return { generatedName, values, decorators, annotations, src: src.slice(0, end) };
}
