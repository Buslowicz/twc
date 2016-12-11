import { task, src, dest } from "gulp";
import { parse } from "path";
import { createProject } from "gulp-typescript";
import * as through2 from "through2";
import * as merge from "merge2";
import * as Vinyl from "vinyl";
import Module from "./src/PolymerModule";

const tsProject = createProject({
  experimentalDecorators: true,
  declaration: true,
  removeComments: true,
  noEmitHelpers: true,
  sourceMap: true,
  target: "es6",
  module: "commonjs",
  lib: [
    "dom",
    "es6"
  ]
});

function ts2html(input) {
  let map = new Map();
  let tsStream = input.pipe(tsProject());

  return merge([ tsStream.dts, tsStream.js ])
    .pipe(through2.obj(function (file, enc, next) {
      let ext = "";
      let path = file.path.replace(/\.(js)|\.d\.(ts)/, (_, js, dts) => {
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
        this.push(pair.ts);
        this.push(new Vinyl({
          path, cwd: file.cwd, base: parse(path).dir,
          contents: new Module(pair.ts.contents.toString(), pair.js.contents.toString()).toBuffer()
        }));
      }
      next();
    }));
}

task("test", () => {
  return ts2html(src([
    "types/annotations.d.ts",
    "tests/assets/types.d.ts",
    "tests/assets/input-math.ts",
    "tests/assets/element-name.ts"
  ]))
    .pipe(through2.obj((file, enc, next) => {
      console.log(file);
      next(null, file);
    }))
    .pipe(dest("out"));

  //
  // const config = { polymerVersion: 1 };

  // return buildModule(tsResult, config);
});
