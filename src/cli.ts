#!/usr/bin/env node

import program = require("commander");
import { join, parse } from "path";
import { src, dest } from "gulp";
import twc = require("./index");

if (require.main === module) {
  let files = null;
  program
    .option("-p, --tsConfig <path>", "tsconfig.json file location")
    .option("-b, --bowerConfig <path>", "bower.json file location")
    .option("-o, --outDir <path>", "Redirect output structure to the directory.")
    .option("-r, --rootDir <path>",
      "Specify the root directory of input files. Use to control the output directory structure with --out-dir.")
    .arguments("<sources...>")
    .action(sources => files = sources)
    .parse(process.argv);

  let cwd = process.cwd();
  const fullPath = path => path ? join(cwd, path) : undefined;

  let base = fullPath(program[ "rootDir" ]);

  if (!base) {
    // calculate the rootDir if it wasn't provided via --rootDir (tsc style, longest common prefix)
    base = files.map(file => parse(file).dir).reduce((a, b) => {
      let A = [ a, b ].concat().sort(),
        a1 = A[ 0 ], a2 = A[ A.length - 1 ], L = a1.length, i = 0;
      while (i < L && a1.charAt(i) === a2.charAt(i)) {
        i++;
      }
      return a1.substring(0, i);
    });
  }

  console.time("Done");
  twc(src(files || [ "*.ts" ], { cwd, base }), {
    tsConfigPath: fullPath(program[ "tsConfig" ]),
    bowerConfigPath: fullPath(program[ "bowerConfig" ])
  })
    .pipe(dest(program[ "outDir" ] || base))
    .on("finish", () => {
      console.timeEnd("Done");
      process.exit(0);
    });
}
