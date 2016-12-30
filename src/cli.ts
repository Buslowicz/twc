#!/usr/bin/env node

import { join } from "path";
import { src, dest } from "gulp";
import program = require("commander");
import twc = require("./index");

if (require.main === module) {
  program
    .option("-t, --ts-config <path>", "tsconfig.json file location")
    .option("-b, --bower-config <path>", "bower.json file location")
    .option("-o, --out-dir <path>", "Output file")
    .parse(process.argv);

  let cwd = process.cwd();
  let files = program.args;

  console.time("Done");
  twc(src(files.length === 0 ? [ "*.ts" ] : files, { cwd }), {
    tsConfigPath: program[ "tsConfig" ] ? join(process.cwd(), program[ "tsConfig" ]) : undefined,
    bowerConfigPath: program[ "bowerConfig" ] ? join(process.cwd(), program[ "bowerConfig" ]) : undefined
  })
    .pipe(dest(program[ "outDir" ] || "out", { cwd }))
    .on("finish", () => {
      console.timeEnd("Done");
      process.exit(0);
    });
}
