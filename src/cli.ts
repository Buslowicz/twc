#!/usr/bin/node
// import * as commandLineArgs from "command-line-args";
// import * as commandLineUsage from "command-line-usage";
import { existsSync, mkdirSync, readFileSync, watchFile, writeFileSync } from "fs";
import { basename, dirname, join, relative, resolve } from "path";
import { fileExists } from "ts-node/dist";
import { CompilerOptions, createSourceFile, findConfigFile, MapLike, parseCommandLine, readConfigFile, SourceFile, sys } from "typescript";
import { Module } from "./builder";

const packageJson = readConfigFile(
  findConfigFile(module.filename, fileExists, "package.json"), (path) => `${readFileSync(path, "utf-8")}`
).config;

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
  const path = join(options.compilerOptions.outDir || "", fileName.replace(/.ts$/, ".html"));
  if (!existsSync(path)) {
    dirname(path).split("/").reduce((prev, curr) => {
      const p = join(prev, curr);
      if (!existsSync(p)) {
        mkdirSync(p);
      }
      return p;
    }, "");
  }
  writeFileSync(path, new Module(source, options.compilerOptions, options.compileTo).toString());
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

const config = parseCommandLine(process.argv.slice(2), (path) => readFileSync(path, "utf-8").toString());

const tsConfigLocation = findConfigFile(
  join(process.cwd(), dirname(config.options.project || "tsconfig.json")),
  fileExists,
  basename(config.options.project || "tsconfig.json")
);

const projectLocation = dirname(tsConfigLocation);

if (!tsConfigLocation) {
  throw new Error("TSConfig file was not found. Please make sure `twc` was fired in TypeScript project with `tsconfig.json` file present.");
}

const { config: tsConfig }: { config?: Config } = readConfigFile(tsConfigLocation, (path) => `${readFileSync(path, "utf-8")}`);

/** Some features are not yet supported in twc. To not let them break anything or mess up, we need to disable them upfront. */
const twcOverrides: CompilerOptions = {
  sourceMap: false
};

Object.assign(tsConfig.compilerOptions, config.options, twcOverrides);

if (!tsConfig.exclude) {
  tsConfig.exclude = [];
}

if (!tsConfig.include) {
  tsConfig.include = [];
}

if (!tsConfig.files) {
  tsConfig.files = [];
}

const files = config.fileNames.length ? config.fileNames : sys
  .readDirectory(
    dirname(tsConfigLocation),
    [ "ts", ...(tsConfig.compilerOptions.allowJs ? [ "js" ] : []) ],
    tsConfig.exclude,
    tsConfig.include.length === 0 && tsConfig.files.length === 0 ? [ "**/*" ] : tsConfig.include
  )
  .concat(tsConfig.files.map((file) => resolve(file)))
  .filter((path) => !path.endsWith(".d.ts"))
  .map((path) => relative(join(projectLocation, tsConfig.compilerOptions.baseUrl || ""), path));

if (config.errors.length) {
  console.error(config.errors.map(({ messageText }) => messageText).join("\n"));
  process.exit(config.errors[ 0 ].code);
} else if (config.options.version) {
  console.log(`Version ${packageJson.version}`);
  process.exit();
} else if (config.options.help) {
  console.log([
    `Version ${packageJson.version}`,
    `Syntax:    twc [options [file ...]`,
    "",
    "Examples:  twc my-component.ts",
    "           twc --outDir dist src/*.ts",
    "",
    "Options:",
    " -h, --help                      Print this message.",
    " -v, --version                   Print the twc version",
    " -p, --project                   Compile the project given the path to its configuration file, or to a folder with a `tsconfig.json`.",
    " -w, --watch                     Watch input files for changes.",
    "",
    "Compiler options:",
    "Just as with `tsc` you can pass on the compiler options within the command line. These options will override tsconfig.json file. For" +
    " the list of options refer to tsc documentation (you can quickly check it by running `tsc --all`)."
  ].join("\n"));
  process.exit();
} else if (config.options.watch) {
  watch(files, tsConfig);
} else {
  files.forEach((fileName) => emitFile(fileName, tsConfig));
}
