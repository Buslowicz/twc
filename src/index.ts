import "typescript/lib/typescriptServices";
import { join, parse } from "path";
import { existsSync } from "fs";
import { createProject } from "gulp-typescript";
import * as through2 from "through2";
import * as merge from "merge2";
import Module from "./PolymerModule";
import ReadWriteStream = NodeJS.ReadWriteStream;
import find = require("find-up");

function getFullConfig(path: string, override?: ts.CompilerOptions): ts.CompilerOptions {
  let config = require(path);
  let co = config.compilerOptions;
  if (config.extends) {
    co = getFullConfig(join(parse(path).dir, config.extends), co);
  }
  return Object.assign(co, override);
}

function ts2html(input, { tsConfigPath = find.sync("tsconfig.json"), bowerConfigPath = find.sync("bower.json") } = {}) {
  const { 1: polymerVersion = 1 } = existsSync(bowerConfigPath) ? require(bowerConfigPath)
      .dependencies
      .polymer
      .match(/#[\D]*(\d)(?:\.\d)+/) || {} : {};

  const tsConfig = Object.assign(
    getFullConfig(existsSync(tsConfigPath) ? tsConfigPath : join(__dirname, "config.json")),
    {
      typescript: require("typescript"),
      noEmit: false,
      declaration: true
    },
    Number(polymerVersion) === 2 ? { target: "es6" } : null
  );

  let map: Map<string, FilePair> = new Map<string, FilePair>();
  let tsStream: ReadWriteStream & { js: ReadWriteStream; dts: ReadWriteStream } = input
    .pipe(through2.obj((file, enc, next) => file.path.endsWith(".ts") ? next(null, file) : next()))
    .pipe(createProject(tsConfig)());

  let nonTsStream: ReadWriteStream = input
    .pipe(through2.obj((file, enc, next) => file.path.endsWith(".ts") ? next() : next(null, file)));

  return merge([
    nonTsStream,
    merge([ tsStream.dts, tsStream.js ])
      .pipe(through2.obj(function (file, enc, next) {
        let ext = "";
        let path = file.path.replace(/\.(js)$|\.d\.(ts)$/, (_, js, dts) => {
          ext = js || dts;
          return ".html";
        });

        let pair = map.get(path);
        if (!pair) {
          pair = {};
          map.set(path, pair);
        }

        pair[ ext ] = file;

        if (pair.js && pair.ts) {
          map.delete(path);
          pair.js.path = path;
          pair.js.contents = new Module(file.base, pair.ts.contents.toString(), pair.js.contents.toString())
            .toBuffer(Number(polymerVersion));

          this.push(pair.ts);
          this.push(pair.js);
        }
        next();
      }))
  ]);
}

export = ts2html;
