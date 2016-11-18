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

const METHOD_PARSER = /^([\w\s]*)(?:\s|^)([\w_$]+)\((.*)\)(?:: ?(.*))?;/;
const PROPERTY_PARSER = /^([\w\s]*)(?:\s|^)([\w_$]+\??)(?:: ?(.*))?;/;

const ALLOWED_METHOD_TYPES = ["boolean", "date", "number", "string", "void"];
const DEFAULT_METHOD_TYPE = "void";

const ALLOWED_PROPERTY_TYPES = ["boolean", "date", "number", "string"];
const DEFAULT_PROPERTY_TYPE = "object";

const ARRAY_REGEXP = /Array|\[]$|^\[.*]$/;

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
    {noEmit: false}
  ));
}

exports.clean = clean;
function clean() {
  return del([dest]);
}

exports.lint = lint;
function lint() {
  return new Promise((resolve, reject) => gulp
    .src(srcs)
    .pipe(tslint({formatter: "prose"}))
    .pipe(tslint.report())
    .on("end", resolve)
    .on("error", reject));
}

function parseProperty(line, properties = []) {
  let [, modifiers, property, type = DEFAULT_PROPERTY_TYPE] = PROPERTY_PARSER.exec(line) || [];
  if (!property) {
    return false;
  }
  let propertyConfig = {
    name: property,
    type: ALLOWED_PROPERTY_TYPES.indexOf(type) !== -1 ? type : ARRAY_REGEXP.test(type) ? 'array' : DEFAULT_PROPERTY_TYPE
  };

  modifiers
    .split(/\s/)
    .filter(modifier => !!modifier)
    .forEach(modifier => propertyConfig[modifier] = true);

  properties.push(propertyConfig);
  return true;
}

function parseMethod(line, methods = []) {
  let [, modifiers, method, params, type] = METHOD_PARSER.exec(line) || [];
  if (!method) {
    return false;
  }
  let paramsList = [];
  params.split(/,\s*/).forEach(param => parseProperty(`${param};`, paramsList));

  let methodConfig = {
    name: method,
    type: ALLOWED_METHOD_TYPES.indexOf(type) !== -1 ? type : ARRAY_REGEXP.test(type) ? 'array' : DEFAULT_METHOD_TYPE,
    params: paramsList
  };

  // abstract, get, set, public, protected, private, static
  modifiers
    .split(/\s/)
    .filter(modifier => !!modifier)
    .forEach(modifier => methodConfig[modifier] = true);

  methods.push(methodConfig);
  return true;
}

exports.parseDTS = parseDTS;
function parseDTS(dts) {
  let properties = [];
  let methods = [];
  let className;
  let lines = dts.split('\n');
  let openBrackets = -1;
  let done = 0;
  for (let _i = 0, _l1 = lines.length, line = lines[_i]; _i < _l1; line = lines[++_i]) {
    for (let _j = 0, _l2 = line.length, char = line.charAt(_j); _j < _l2; char = line.charAt(++_j)) {
      if (openBrackets === -1) {
        let i = line.indexOf(" class ");
        if (i >= 0) {
          [, className] = /class ([\w_$]+)/.exec(line) || [];
          openBrackets = 0;
          _j = i + 7;
          continue;
        } else {
          break;
        }
      }

      if (char === "{") {
        openBrackets++;
      } else if (char === "}") {
        openBrackets--;

        if (openBrackets === 0) {
          done = 1;
          break;
        }
      }
    }

    if (done) {
      break;
    }

    if (openBrackets <= 0) {
      continue;
    }

    // the following should be done within line iteration, but i couldn't bother for the prototype, so:
    // TODO: improve performance
    parseProperty(line, properties) || parseMethod(line, methods);
  }
  return {className, properties, methods};
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
            `<script>\n${content}\n</script>`
          );
        }))
        .pipe(rename({extname: ".html"}))
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
