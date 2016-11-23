"use strict";
const path = require("path");
const ts = require("gulp-typescript");
const del = require("del");
const gulp = require("gulp");
const tslint = require("gulp-tslint");
const rename = require("gulp-rename");
const transform = require("gulp-transform");
const merge = require("merge2");

const CWD = process.cwd();

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

let globalTSConfig;
let projectTSConfig;

let project;

let dest;
let srcs;

exports.init = init;
function init({
  globalConfig = require(path.join(__dirname, "tsconfig.json")),
  projectConfig = require(path.join(CWD, "tsconfig.json")),
  dist = path.join(CWD, "dist"),
  src = (projectConfig.files || []).concat(projectConfig.include || []).map(src => path.join(CWD, src))
}) {
  globalTSConfig = globalConfig;
  projectTSConfig = projectConfig;
  dest = dist;
  srcs = src;

  project = ts.createProject(Object.assign({},
    globalConfig.compilerOptions,
    projectConfig.compilerOptions,
    { noEmit: false }
  ));
}

exports.clean = clean;
function clean() {
  return del([ dest ]);
}

exports.lint = lint;
function lint() {
  //noinspection JSCheckFunctionSignatures
  return new Promise((resolve, reject) => gulp
    .src(srcs)
    .pipe(tslint({ formatter: "prose" }))
    .pipe(tslint.report())
    .on("end", resolve)
    .on("error", reject));
}

exports.findClosing = findClosing;
function findClosing(src, ptr, brackets) {
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

findClosing.OBJECT = "{}";
findClosing.ARRAY = "[]";
findClosing.GENERIC = "<>";
findClosing.PARENTHESIS = "()";

exports.regExpClosestIndexOf = regExpClosestIndexOf;
function regExpClosestIndexOf(src, index = 0, chars = /;|:|\(/) {
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

exports.regExpIndexOf = regExpIndexOf;
function regExpIndexOf(src, ptr, match = /\S/) {
  let char;
  while ((char = src.charAt(ptr))) {
    if (match.test(char)) {
      return ptr;
    }
    ptr++;
  }
  return -1;
}

exports.getPropertyNoType = getPropertyNoType;
function getPropertyNoType(src, from, to) {
  let [...modifiers] = src.slice(from || 0, to ? to : src.indexOf(";")).split(" ");
  let name = modifiers.pop();
  return { name, modifiers };
}

exports.getType = getType;
function getType(src, from = 0) {
  // FIXME function interface type ( () => void; )
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
        index = findClosing(src, index, findClosing.OBJECT);
        start = ++index;
        break;
      case "[":
        types.push(TYPES.ARRAY);
        index = findClosing(src, index, findClosing.ARRAY);
        start = ++index;
        break;
      case "<":
        type = src.slice(start, index).trim();
        if (type.length > 0) {
          types.push(type);
        }
        index = findClosing(src, index, findClosing.GENERIC);
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

exports.arrToObject = arrToObject;
function arrToObject(arr, value = true) {
  let obj = {};
  for (let i = 0, l = arr.length; i < l; i++) {
    obj[ arr[ i ] ] = value;
  }
  return obj;
}

exports.parseParams = parseParams;
function parseParams(src, from = 0, to = src.length) {
  let params = [];
  while (from < to) {
    let firstStop = regExpClosestIndexOf(src, from, /,|:/);
    if (firstStop.index === -1) {
      params.push({ name: src.slice(from, to).trim() });
      break;
    }
    let param = { name: src.slice(from, firstStop.index).trim() };

    if (firstStop.found === ":") {
      let typeData = getType(src, firstStop.index + 1);
      if (typeData.type) {
        param.type = typeData.type;
      }
      from = typeData.end + 1;
    } else {
      from = firstStop.index + 1;
    }

    params.push(param);
  }

  return params;
}

exports.buildField = buildField;
function buildField(modifiers, name, params, type) {
  let config = { name };
  if (params) {
    config.params = params;
  }
  if (type) {
    config.type = type;
  }
  return Object.assign({}, arrToObject(modifiers), config);
}

exports.getParamsData = getParamsData;
function getParamsData(src, ptr = 0) {
  let closeIndex = findClosing(src, ptr, findClosing.PARENTHESIS);

  // find the colon to start searching for type
  let params = parseParams(src, ptr + 1, closeIndex);
  return { closeIndex, params };
}

exports.parseDTS = parseDTS;
function parseDTS(src) {
  let match = src.match(/[\s\n]class ([\w$_]+)(?:[\s]+extends ([^{]+))?[\s]*\{/);
  if (!match) {
    return {};
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
    } else {
      properties.push(buildField(modifiers, name, null, type));
    }
  }

  return { className, parent, properties, methods };
}

exports.parseJS = parseJS;
function parseJS(src, { className, properties }) {
  const constructorPattern = new RegExp(`(class|function)[\\s]*${className}.*?{`);
  const defaultValuePattern = new RegExp(`this\\.(${properties.map(itm => itm.name).join("|")}) = (.*);\\n`, "g");
  const decoratorPattern = new RegExp(`__decorate\\((\\[[\\W\\w]*?]), ${className}\\.prototype, "(.*?)", .*?\\);`, "g");

  let {index, 1: match} = src.match(constructorPattern) || {};

  if (!match) {
    return {};
  }
  if (match === "class") {
    index = src.indexOf("constructor", index);
  }

  index = src.indexOf("{", index);

  let end = findClosing(src, index, findClosing.OBJECT);

  let values = {};
  let decorators = {};

  src.slice(index + 1, end).replace(defaultValuePattern, (m, name, value) => values[ name ] = value);
  src.replace(decoratorPattern, (m, decor, name) => decorators[name] = decor);

  return { values, decorators };
}

exports.buildHTML = buildHTML;
function buildHTML() {
  return new Promise((resolve, reject) => {
    const stream = gulp
      .src(srcs)
      .pipe(project());

    merge([ // Merge the two output streams, so this task is finished when the IO of both operations is done.
      stream.dts
        .pipe(transform(model => {
          console.log(parseDTS(model.toString()));
        })),

      stream.js
        .pipe(transform(content => {
          let links = [];
          let scripts = [];
          content = content
            .toString()
            .replace(/require\(['"](link|script)!(.*?)['"]\);\n?/g, (m, type, module) => {
              switch (type) {
                case "link":
                  links.push(module);
                  break;
                case "script":
                  scripts.push(module);
                  break;
              }
              return "";
            });
          return Buffer.from(
            links.map(module => `<link rel="import" href="${module}">\n`).join("") +
            scripts.map(module => `<script src="${module}"></script>\n`).join("") +
            "<script>\n" + content + "\n</script>"
          );
        }))
        .pipe(rename({ extname: ".html" }))
        .pipe(gulp.dest(dest))
    ])
      .on("end", resolve)
      .on("error", reject);
  });
}

exports.build = build;
function build() {
  clean()
    .then(lint)
    .then(buildHTML);
}
