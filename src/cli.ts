#!/usr/bin/env node

const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
import twc = require("./index");
import { join, parse } from "path";
import { existsSync, readFileSync } from "fs";
import { src, dest } from "gulp";

const cliOptions = [
  {
    name: "tsConfig",
    alias: "p",
    type: String,
    description: "tsconfig.json file location",
    typeLabel: "[underline]{path}",
    defaultValue: "tsconfig.json"
  },
  {
    name: "bowerConfig",
    alias: "b",
    type: String,
    description: "bower.json file location",
    typeLabel: "[underline]{path}",
    defaultValue: "bower.json"
  },
  {
    name: "outDir",
    alias: "o",
    type: String,
    description: "Redirect output structure to the directory.",
    typeLabel: "[underline]{path}"
  },
  {
    name: "rootDir",
    alias: "r",
    type: String,
    description: "Specify the root directory of input files. " +
    "Use to control the output directory structure with --outDir.",
    typeLabel: "[underline]{path}"
  },
  {
    name: "help",
    alias: "?",
    type: Boolean,
    description: "Shows this help"
  },
  {
    name: "input",
    type: String,
    multiple: true,
    defaultOption: true,
    defaultValue: [ "*.ts" ]
  }
];
let cli;

try {
  cli = commandLineArgs(cliOptions);
} catch (e) {
  console.error(e.message);
  process.exit(-1);
}

let files = cli.input;
if (cli.help) {
  console.log(commandLineUsage([
    {
      header: "Typed Web Components",
      content: "Convert TypeScript classes into native Polymer components"
    },
    {
      header: "Syntax",
      content: "twc [options] [file ...]"
    },
    {
      header: "Examples",
      content: [
        "twc my-element.ts",
        "twc --outDir dist *.ts",
        "twc --tsConfig custom-config.json src/**/*.ts"
      ].join("\n")
    },
    {
      header: "Options", optionList: cliOptions.slice(0, -1)
    }
  ]));
  process.exit();
}
if (files.length === 0) {
  console.error("No files given");
  process.exit(-1);
}

let cwd = process.cwd();
const fullPath = path => path ? join(cwd, path) : undefined;

let base = fullPath(cli.rootDir);

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

const config = <any> {
  tsConfigPath: fullPath(cli.tsConfig),
  bowerConfigPath: fullPath(cli.bowerConfig)
};
let bowerRCFilePath = fullPath(".bowerrc");
if (existsSync(bowerRCFilePath)) {
  config.bowerDir = JSON.parse(readFileSync(bowerRCFilePath).toString()).directory;
}
console.time("Done");
twc(src(files || [ "*.ts" ], { cwd, base }), config)
  .pipe(dest(cli.outDir || base))
  .on("finish", () => {
    console.timeEnd("Done");
    process.exit(0);
  });
