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
  return Object.assign(co || {}, override);
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
      declaration: true,
      experimentalDecorators: true,
      module: "commonjs",
      noEmit: false
    }
  );
  tsConfig.target = <ts.ScriptTarget> (Number(polymerVersion) === 2 ? "es6" : tsConfig.target || "es5");
  let map: Map<string, FileSources> = new Map<string, FileSources>();
  let tsStream: ReadWriteStream & { js: ReadWriteStream; dts: ReadWriteStream } = input
    .pipe(through2.obj((file, enc, next) => {
      if (file.path.endsWith(".ts")) {
        map.set(file.path.replace(/\.ts$/, ".html"), { src: file });
        next(null, file);
      } else {
        next();
      }
    }))
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

        let sources = map.get(path);
        sources[ ext ] = file;

        if (sources.js && sources.ts) {
          let tsPath = sources.ts.path.replace(/d\.ts$/, "ts");
          map.delete(path);
          sources.js.path = path;
          sources.js.contents = new Module(
            tsPath,
            sources.src.contents.toString(),
            sources.ts.contents.toString(),
            sources.js.contents.toString()
          )
            .toBuffer(Number(polymerVersion));

          this.push(sources.ts);
          this.push(sources.js);
        }
        next();
      }))
  ]);
}

export = ts2html;
