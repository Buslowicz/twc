#!/usr/bin/node
// import * as commandLineArgs from "command-line-args";
// import * as commandLineUsage from "command-line-usage";
import { readFileSync, watchFile, writeFileSync } from "fs";
import { fileExists } from "ts-node/dist";
import { CompilerOptions, createSourceFile, findConfigFile, MapLike, readConfigFile, SourceFile } from "typescript";
import { Module } from "./builder";

// console.log(JSON.stringify(process.argv.slice(2).reduce((config, option) => {
//   if (option.startsWith("-")) {
//     config.lastOption = config.options[ option.substr(option.startsWith("--") ? 2 : 1) ] = { option, params: [] };
//   } else {
//     config.lastOption.params.push(option);
//   }
//   return config;
// }, { lastOption: null, options: {} }).options, null, 2));

interface Config {
  compilerOptions: CompilerOptions;
  include: Array<string>;
  exclude: Array<string>;
  files: Array<string>;
  compileOnSave: boolean;
  extends: string;
  typeAcquisition: object;
  compileTo: "Polymer1" | "Polymer2";
}

function emitFile(fileName: string, options: Config) {
  const source: SourceFile = createSourceFile(fileName, readFileSync(fileName).toString(), options.compilerOptions.target, true);
  writeFileSync(fileName.replace(/.ts$/, ".html"), new Module(source, options.compilerOptions, options.compileTo).toString());
}

function watch(rootFileNames: string[], options: Config) {
  const files: MapLike<{ version: number }> = {};

  rootFileNames.forEach((fileName) => {
    files[ fileName ] = { version: 0 };

    emitFile(fileName, options);

    watchFile(fileName, { persistent: true, interval: 250 }, (curr, prev) => {
      if (+curr.mtime <= +prev.mtime) {
        return;
      }
      files[ fileName ].version++;

      emitFile(fileName, options);
    });
  });
}

const cliArgs = {
  "--watch": {
    params: 0
  }
};

const files = process.argv.slice(2);

const config = Object
  .keys(cliArgs)
  .reduce((conf, arg) => {
    const index = files.indexOf(arg);
    if (index !== -1) {
      const [ name, ...params ] = files.splice(index, 1 + cliArgs[ arg ].params);
      conf[ name.substr(2) ] = params.length ? params : true;
    }
    return conf;
  }, {
    watch: false,
    help: false,
    tsConfig: "tsconfig.json",
    bowerConfig: "bower.json"
  });

// Initialize files constituting the program as all .ts files in the current directory
// const currentDirectoryFiles = readdirSync(process.cwd())
//   .filter((fileName) => fileName.length >= 3 && fileName.substr(fileName.length - 3, 3) === ".ts");

const tsConfigLocation = findConfigFile(process.cwd(), fileExists, config.tsConfig);

if (!tsConfigLocation) {
  throw new Error("TSConfig file was not found. Please make sure `twc` was fired in TypeScript project with `tsconfig.json` file present.");
}

const { config: tsConfig }: { config?: Config } = readConfigFile(tsConfigLocation, (path) => `${readFileSync(path, "utf-8")}`);

if (config.help) {
  console.log("...help...");
  process.exit();
} else if (config.watch) {
  watch(files, tsConfig);
} else {
  files.forEach((fileName) => {
    emitFile(fileName, tsConfig);
  });
}

// const cliOptions = [
//   {
//     alias: "p",
//     defaultValue: "tsconfig.json",
//     description: "tsconfig.json file location",
//     name: "tsConfig",
//     type: String,
//     typeLabel: "[underline]{path}"
//   },
//   {
//     alias: "b",
//     defaultValue: "bower.json",
//     description: "bower.json file location",
//     name: "bowerConfig",
//     type: String,
//     typeLabel: "[underline]{path}"
//   },
//   {
//     alias: "?",
//     description: "Shows this help",
//     name: "help",
//     type: Boolean
//   }
// ];
// let cli;

// try {
//   cli = commandLineArgs(cliOptions);
// } catch (e) {
//   console.error(e.message);
//   process.exit(-1);
// }

// if (cli.help) {
//   console.log(commandLineUsage([
//     {
//       content: "Convert TypeScript classes into native Polymer components",
//       header: "Typed Web Components"
//     },
//     {
//       content: "twc [options]",
//       header: "Syntax"
//     },
//     {
//       content: [
//         "twc",
//         "twc --tsConfig custom-config.json"
//       ].join("\n"),
//       header: "Examples"
//     },
//     {
//       header: "Options", optionList: cliOptions.slice(0, -1)
//     }
//   ]));
//   process.exit();
// }
