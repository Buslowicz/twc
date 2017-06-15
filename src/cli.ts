#!/usr/bin/env node

import * as commandLineArgs from "command-line-args";
import * as commandLineUsage from "command-line-usage";
import "typescript/lib/typescriptServices";

const cliOptions = [
  {
    alias: "p",
    defaultValue: "tsconfig.json",
    description: "tsconfig.json file location",
    name: "tsConfig",
    type: String,
    typeLabel: "[underline]{path}"
  },
  {
    alias: "b",
    defaultValue: "bower.json",
    description: "bower.json file location",
    name: "bowerConfig",
    type: String,
    typeLabel: "[underline]{path}"
  },
  {
    alias: "?",
    description: "Shows this help",
    name: "help",
    type: Boolean
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
      content: "Convert TypeScript classes into native Polymer components",
      header: "Typed Web Components"
    },
    {
      content: "twc [options]",
      header: "Syntax"
    },
    {
      content: [
        "twc",
        "twc --tsConfig custom-config.json"
      ].join("\n"),
      header: "Examples"
    },
    {
      header: "Options", optionList: cliOptions.slice(0, -1)
    }
  ]));
  process.exit();
}
