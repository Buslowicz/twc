#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, watchFile, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createSourceFile, MapLike, SourceFile } from "typescript";
import { Module } from "./builder";
import { cache, cli, compilerOptions, compileTo, errors, files, twc } from "./config";
import { outPath } from "./helpers";

/**
 * Make sure the path exists. If it doesn't, create it.
 *
 * @param path Path to ensure
 *
 * @returns Ensured path
 */
function ensurePath(path: string) {
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
  return path;
}

/**
 * Transpile the file and save on the disk.
 *
 * @param fileName Path of the file to transpile
 */
function emitFile(fileName: string) {
  const source: SourceFile = createSourceFile(fileName, readFileSync(fileName).toString(), compilerOptions.target, true);
  cache.update(source);
  writeFileSync(ensurePath(outPath(fileName.replace(/.ts$/, ".html"))), new Module(source, compilerOptions, compileTo).toString());
}

/**
 * Watch provided files for changes. Whenever a chang happens, emit the file.
 *
 * @param rootFileNames Array of files to watch
 */
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
    "Examples:  twc",
    "           twc my-component.ts",
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
