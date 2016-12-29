#!/usr/bin/env node

import program = require("commander");
import { src, dest } from "gulp";
import ts2html = require("./index");
import through2 = require("through2");

if (require.main === module) {
  program
    .version("0.0.3", "-v")
    .option("-o, --out-dir <value>", "Output file")
    .parse(process.argv);

  let cwd = process.cwd();
  let files = program.args;

  console.time("Done");
  ts2html(src(files.length === 0 ? [ "*.ts" ] : files, { cwd }))
    .pipe(dest(program[ "outDir" ] || "out", { cwd }))
    .on("finish", _ => {
      console.timeEnd("Done");
      process.exit(0);
    });
}
