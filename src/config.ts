import { existsSync, readFileSync } from "fs";
import { basename, dirname, join, relative, resolve } from "path";
import { CompilerOptions, findConfigFile, parseCommandLine, readConfigFile, sys } from "typescript";

export type ModuleType = "globals" | "amd" | "node" | "es6" | "yui";

export type CompileTarget = "Polymer1" | "Polymer2";

export interface Author {
  name?: string;
  email?: string;
  homepage?: string;
}

export interface Repository {
  type: "git";
  url: string;
}

export interface TSConfig {
  compilerOptions: CompilerOptions;
  include: Array<string>;
  exclude: Array<string>;
  files: Array<string>;
  compileOnSave: boolean;
  typeAcquisition: object;
}

export interface Config {
  name: string;
  description: string;
  main: string | Array<string>;
  license: string | Array<string>;
  keywords: string | Array<string>;
  homepage: string;
  repository: Repository;
  dependencies: object;
  devDependencies: object;
  private: boolean;
}

export interface BowerRc {
  cwd: string;
  directory: string;
  registry: string;
  "shorthand-resolver": string;
  proxy: string;
  "https-proxy": string;
  ca: string;
  color: true;
  timeout: number;
  save: boolean;
  "save-exact": true;
  "strict-ssl": true;
  storage: {
    packages: string;
    registry: string;
    links: string;
  };
  interactive: true;
  resolvers: Array<string>;
  shallowCloneHosts: Array<string>;
  scripts: {
    preinstall: string;
    postinstall: string;
    preuninstall: string;
  };
  ignoredDependencies: Array<string>;
}

export interface BowerConfig extends Config {
  moduleType: ModuleType | Array<ModuleType>;
  ignore: string | Array<string>;
  authors: Array<string | Author>;
  resolutions: object;
}

export interface NPMConfig extends Config {
  version: string;
  scripts: object;
  bin: object;
  author: string | Author;
}

/**
 * Find rootDir for files (Longest Common Prefix).
 *
 * @param files List of files to find rootDir for
 *
 * @returns Root directory for the files
 */
export function findRootDir(files: Array<string>): string {
  const clone = files.concat().sort();
  if (clone.length <= 1) {
    return files[ 0 ] || "";
  }
  const first = clone[ 0 ];
  const last = clone[ clone.length - 1 ];
  const max = first.length;
  let i = 0;
  while (i < max && first[ i ] === last[ i ]) {
    i++;
  }
  return first.substring(0, i);
}

/**
 * Read file synchronously and return as a string.
 *
 * @param path Path of the file
 *
 * @returns File contents
 */
function readFileAsString(path: string): string {
  return readFileSync(path, "utf-8").toString();
}

const twc = readConfigFile(findConfigFile(module.filename, existsSync, "package.json"), readFileAsString).config;

const { fileNames, options, errors } = parseCommandLine(process.argv.slice(2), readFileAsString);

if (!options.project) {
  options.project = "tsconfig.json";
}

const tsConfigPath = findConfigFile(join(process.cwd(), dirname(options.project)), existsSync, basename(options.project));

if (!tsConfigPath) {
  throw new Error("TSConfig file was not found. Please make sure `twc` was fired in TypeScript project with `tsconfig.json` file present.");
}

const projectRoot = dirname(tsConfigPath);

const bowerRc: BowerRc = readConfigFile(join(projectRoot, ".bowerrc"), readFileAsString).config || {};
const bower: BowerConfig = readConfigFile(join(projectRoot, "bower.json"), readFileAsString).config || {};
const npm: NPMConfig = readConfigFile(join(projectRoot, "package.json"), readFileAsString).config || {};
const tsConfig: TSConfig = readConfigFile(tsConfigPath, readFileAsString).config || {};

const { compilerOptions = {}, exclude = [], files: inputFiles = [], include = [] } = tsConfig;

const compileTo: CompileTarget = `Polymer${((bower.dependencies || {})[ "polymer" ] || "").match(/\d/) || 2}` as any;

const paths = {
  npm: process.env.npmDir || "node_modules",
  bower: process.env.bowerDir || bowerRc.directory || ".."
};

// Some features are not yet supported in twc. To not let them break anything or mess up, we need to disable them upfront.
const twcOverrides: CompilerOptions = {
  sourceMap: false
};

Object.assign(compilerOptions, options, twcOverrides);

const files = fileNames.length ? fileNames : sys
  .readDirectory(
    dirname(tsConfigPath),
    [ "ts", ...(compilerOptions.allowJs ? [ "js" ] : []) ],
    exclude,
    include.length === 0 && inputFiles.length === 0 ? [ "**/*" ] : include
  )
  .concat(inputFiles.map((file) => resolve(file)))
  .filter((path) => !path.endsWith(".d.ts"))
  .map((path) => relative(join(projectRoot, compilerOptions.baseUrl || ""), path));

if (!("rootDir" in compilerOptions)) {
  compilerOptions.rootDir = findRootDir(files);
}

export { twc, tsConfig, npm, bower, compilerOptions, compileTo, options as cli, errors, files, projectRoot, tsConfigPath, paths };
