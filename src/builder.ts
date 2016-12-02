"use strict";
import * as path from "path";
import * as ts from "gulp-typescript";
import * as del from "del";
import * as gulp from "gulp";
import * as rename from "gulp-rename";
import { parseDTS, parseJS } from "./parser";
import { Stream } from "stream";

interface Callable {
  (...args: any[]): any;
}

const transform: Callable = require("gulp-transform");
const tslint: Callable & {report: () => any} = require("gulp-tslint");

const CWD = process.cwd();

interface TSConfig {
  files: string[];
  include: string[];
}

let globalTSConfig: TSConfig;
let projectTSConfig: TSConfig;

let project;

let dest;
let srcs;

export function init({
  globalConfig = require(path.join(__dirname, "tsconfig.json")),
  projectConfig = require(path.join(CWD, "tsconfig.json")),
  dist = path.join(CWD, "dist"),
  src
}) {
  globalTSConfig = globalConfig;
  projectTSConfig = projectConfig;
  dest = dist;
  srcs = src || (projectConfig.files || []).concat(projectConfig.include || []).map(src => path.join(CWD, src));

  project = ts.createProject(Object.assign({},
    globalConfig.compilerOptions,
    projectConfig.compilerOptions,
    { noEmit: false }
  ));
}

export function clean() {
  return del([ dest ]);
}

export function lint() {
  //noinspection JSCheckFunctionSignatures
  return new Promise((resolve, reject) => gulp
    .src(srcs)
    .pipe(tslint({ formatter: "prose" }))
    .pipe(tslint.report())
    .on("end", resolve)
    .on("error", reject));
}

export function buildHTML() {
  return new Promise((resolve, reject) => {
    const stream = gulp
      .src(srcs)
      .pipe(project());

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
      .on("end", resolve)
      .on("error", reject);
  });
}

export function build() {
  clean()
    .then(lint)
    .then(buildHTML);
}

export function parse([dtsSrc, jsSrc]: Array<File & {contents: Buffer}>): DTSParsedData & JSParsedData {
  let dtsMeta = parseDTS(dtsSrc.contents.toString());
  let jsMeta = parseJS(jsSrc.contents.toString(), dtsMeta, { definedAnnotations: [ "test" ] });
  return Object.assign({}, dtsMeta, jsMeta);
}

export function streamToPromise(stream: Stream): Promise<File & {contents: Buffer}> {
  return new Promise((resolve, reject) => stream.on("data", src => resolve(src)).on("error", err => reject(err)));
}

export function buildConfig() {
  let stream = gulp
    .src(srcs)
    .pipe(project());

  let dts = streamToPromise(stream.dts);
  let js = streamToPromise(stream.js);

  return {
    dts, js,
    config: Promise.all([ dts, js ]).then(parse)
  };
}
