#!/usr/bin/env node

import "typescript/lib/typescriptServices";
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
import ReadWriteStream = NodeJS.ReadWriteStream;
import find = require("find-up");
import * as If from "gulp-if";
import * as merge from "merge2";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { dest } from "gulp";
import { createProject } from "gulp-typescript";
import { StreamParser } from "./StreamParser";

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
    name: "help",
    alias: "?",
    type: Boolean,
    description: "Shows this help"
  }
];
let cli;

try {
  cli = commandLineArgs(cliOptions);
} catch (e) {
  console.error(e.message);
  process.exit(-1);
}

if (cli.help) {
  console.log(commandLineUsage([
    {
      header: "Typed Web Components",
      content: "Convert TypeScript classes into native Polymer components"
    },
    {
      header: "Syntax",
      content: "twc [options]"
    },
    {
      header: "Examples",
      content: [
        "twc",
        "twc --tsConfig custom-config.json"
      ].join("\n")
    },
    {
      header: "Options", optionList: cliOptions.slice(0, -1)
    }
  ]));
  process.exit();
}

const cwd = process.cwd();
const fullPath = path => path ? join(cwd, path) : undefined;

const bowerRCFilePath = find.sync(".bowerrc");
const tsConfigPath = cli.tsConfig ? fullPath(cli.tsConfig) : find.sync("tsconfig.json");
const bowerConfigPath = cli.bowerConfig ? fullPath(cli.bowerConfig) : find.sync("bower.json");
const tsConfig = require(tsConfigPath);

const { outDir, declaration, declarationDir } = tsConfig.compilerOptions;

let bowerDir: "bower_components";
if (existsSync(bowerRCFilePath)) {
  bowerDir = JSON.parse(readFileSync(bowerRCFilePath).toString()).directory;
}

console.time("Done");
const { 1: polymerVersion = 1 } = require(bowerConfigPath).dependencies.polymer.match(/#[\D]*(\d)(?:\.\d)+/) || {};
const collector = new StreamParser(Number(polymerVersion), tsConfig.compilerOptions.target, bowerDir);
const tsProject = createProject(tsConfigPath, collector.tsConfig);
const stream: { js: ReadWriteStream; dts: ReadWriteStream } = tsProject.src()
  .pipe(collector.collectSources())
  .pipe(tsProject());

merge([ stream.dts, stream.js ])
  .pipe(collector.generateOutput())
  .pipe(If("*.html", dest(outDir || ".")))
  .pipe(If(({ path }) => declaration && path.endsWith(".d.ts"), dest(declarationDir || outDir || ".")))
  .on("finish", () => {
    console.timeEnd("Done");
    process.exit(0);
  });
