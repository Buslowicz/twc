import { task, src, dest } from "gulp";
import { parse, join } from "path";
import { createProject } from "gulp-typescript";
import * as through2 from "through2";
import * as merge from "merge2";
import * as Vinyl from "vinyl";
import { parseDTS, parseJS } from './src/parser';
import { buildPolymerV1, buildHTMLModule } from './src/code-builders';

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

const storage = new Map();

const dtsAnalyzer = through2.obj((chunk, enc, callback) => {
  storage.set(parse(chunk.history[ 0 ]).base.replace(/\.d\.ts$/, ""), parseDTS(chunk.contents.toString()));
  callback(null, chunk);
});

const jsAnalyzer = through2.obj((chunk, enc, callback) => {
  let file = parse(chunk.history[ 0 ]);
  if (file.ext === ".js") {
    let dts = storage.get(file.name);
    callback(null, { file: chunk, config: Object.assign({}, dts, parseJS(chunk.contents.toString(), dts)) });
  }
  else {
    callback(null, chunk);
  }
});

const generateModule = ({ polymerVersion }) => through2.obj((chunk, enc, callback) => {

  if (chunk.config) {
    let file = parse(chunk.file.history[ 0 ]);
    callback(null, new Vinyl({
      cwd: chunk.file.cwd,
      base: chunk.file.base,
      path: join(chunk.file.base, file.name + ".html"),
      contents: new Buffer(buildHTMLModule(buildPolymerV1(chunk.config)))
    }));
  }
  else {
    callback(null, chunk);
  }
});

const buildModule = (tsResult, config) =>
  merge(tsResult.dts.pipe(dtsAnalyzer), tsResult.js)
    .pipe(jsAnalyzer)
    .pipe(generateModule(config))
    .pipe(dest("tests/assets/dist"));

task("test", () => {
  let tsResult = src([
    "types/annotations.d.ts",
    "tests/assets/types.d.ts",
    "tests/assets/input-math.ts",
    "tests/assets/element-name.ts"
  ])
    .pipe(tsProject());

  const config = { polymerVersion: 1 };

  return buildModule(tsResult, config);
});
