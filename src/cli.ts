#!/usr/bin/node
import { existsSync, mkdirSync, readFileSync, watchFile, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createSourceFile, MapLike, SourceFile } from "typescript";
import { Module } from "./builder";
import { cli, compilerOptions, compileTo, errors, files, twc } from "./config";

function emitFile(fileName: string) {
  const source: SourceFile = createSourceFile(fileName, readFileSync(fileName).toString(), compilerOptions.target, true);
  const path = join(compilerOptions.outDir || "", fileName.replace(/.ts$/, ".html"));
  if (!existsSync(path)) {
    dirname(path)
      .split("/")
      .reduce((prev, curr) => {
        const p = join(prev, curr);
        if (!existsSync(p)) {
          mkdirSync(p);
        }
        return p;
      }, "");
  }
  writeFileSync(path, new Module(source, compilerOptions, compileTo).toString());
}

function watch(rootFileNames: string[]) {
  const files: MapLike<{ version: number }> = {};

  rootFileNames.forEach((fileName) => {
    files[ fileName ] = { version: 0 };

    emitFile(fileName);

    watchFile(fileName, { persistent: true, interval: 250 }, (curr, prev) => {
      if (+curr.mtime <= +prev.mtime) {
        return;
      }
      files[ fileName ].version++;

      emitFile(fileName);
    });
  });
}

if (errors.length) {
  console.error(errors.map(({ messageText }) => messageText).join("\n"));
  process.exit(errors[ 0 ].code);
} else if (cli.version) {
  console.log(`Version ${twc.version}`);
  process.exit();
} else if (cli.help) {
  console.log([
    `Version ${twc.version}`,
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
} else if (cli.watch) {
  watch(files);
} else {
  files.forEach((file) => emitFile(file));
}
