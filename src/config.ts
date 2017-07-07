import { existsSync, readFileSync } from "fs";
import { basename, dirname, join, relative, resolve, sep } from "path";
import {
  BlockLike, CompilerOptions, createProgram, findConfigFile, isClassDeclaration, isFunctionLike, isInterfaceDeclaration, JSDoc,
  NamedDeclaration, parseCommandLine, readConfigFile, SourceFile, SyntaxKind, sys
} from "typescript";
import { isOfKind, isOneOf } from "./helpers";

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

export interface StatementMetaData {
  name: string;
  type: string;
  namespace: string | null;
}

export interface HasJSDoc {
  jsDoc?: Array<JSDoc>;
}

export type ModuleMetaMap = Map<string, StatementMetaData>;

export type SourceFileMetaMap = Map<string, ModuleMetaMap>;

export type FullSourceFile = SourceFile & {
  getNamedDeclarations?: () => Array<NamedDeclaration>;
  ambientModuleNames: Array<string>;
};

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
    const dir = dirname(files[ 0 ] || "");
    return dir === "." ? "" : dir;
  }
  const first = clone[ 0 ].split(sep);
  const last = clone[ clone.length - 1 ].split(sep);
  const max = first.length;
  let i = 0;
  while (i < max && first[ i ] === last[ i ]) {
    i++;
  }
  return first.slice(0, i).join(sep);
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

/**
 * Get name, type and namespace of a statement
 *
 * @param statement Statement to scan
 *
 * @returns Meta data of a statement
 */
function getStatementMeta(statement: NamedDeclaration & HasJSDoc): StatementMetaData {
  return {
    name: statement.name[ "text" ],
    type: SyntaxKind[ statement.kind ],
    namespace: statement.jsDoc ? statement.jsDoc
      .filter((doc) => doc.tags)
      .map((doc) => doc.tags
        .filter((tag) => tag.tagName[ "text" ] === "namespace")
        .map((tag) => tag.comment.trim())
        .reduce((p, c) => c, null)
      )
      .reduce((p, c) => c, null) : null
  };
}

/**
 * Get exported statements meta from a module
 *
 * @param module Module to scan
 *
 * @returns Array of statements name-meta tuples
 */
function statementsFromModule(module: { body: BlockLike }): Array<[ string, StatementMetaData ]> {
  const { body: { statements = [] } = {} } = module;
  return (statements as Array<NamedDeclaration>)
    .filter(({ modifiers, name }) => name && modifiers && modifiers.find(isOfKind(SyntaxKind.ExportKeyword)))
    .filter(isOneOf(isFunctionLike, isClassDeclaration, isInterfaceDeclaration))
    .map((statement: NamedDeclaration & HasJSDoc): [ string, StatementMetaData ] => [
      statement.name[ "text" ],
      getStatementMeta(statement)
    ]);
}

/**
 * Generate an Array::map callback to return an array of moduleName-statementsMap tuples for each ambient module in a file
 *
 * @param declarations Ambient modules declarations
 *
 * @returns Map callback to scan module for statements
 */
function getAmbientModulesFrom(declarations): (mod: string) => [ string, ModuleMetaMap ] {
  return (mod) => [
    mod,
    new Map(declarations
      .get(mod)
      .map(statementsFromModule)
      .reduce((def, arr) => arr, [])
    )
  ];
}

/**
 * Get an array of fileName-modulesMap tuples
 */
function toModulesMap(source: FullSourceFile): [ string, SourceFileMetaMap ] {
  const declarations = source.getNamedDeclarations ? source.getNamedDeclarations() : new Map();
  const ambientModuleNames = source.ambientModuleNames;
  return [ source.fileName, new Map(ambientModuleNames.map(getAmbientModulesFrom(declarations))) ];
}

const projectFiles = sys
  .readDirectory(
    dirname(tsConfigPath),
    [ "ts", ...(compilerOptions.allowJs ? [ "js" ] : []) ],
    exclude,
    include.length === 0 && inputFiles.length === 0 ? [ "**/*" ] : include
  )
  .concat(inputFiles.map((file) => resolve(file)));

const program = createProgram(projectFiles, compilerOptions);

const cache = {
  update(source) {
    if (!source.ambientModuleNames || !source.ambientModuleNames.length) {
      if (this.files.has(source.fileName)) {
        this.files.delete(source.fileName);
      }
      return;
    }
    const [ fileName, map ] = toModulesMap(source);
    this.files.set(fileName, map);
  },
  files: new Map(
    program
      .getSourceFiles()
      .filter((source: any) => source.ambientModuleNames && source.ambientModuleNames.length)
      .map(toModulesMap)
  ),
  get modules(): Map<string, Map<string, { name: string, type: string, namespace: string | null }>> {
    return new Map(Array.from(this.files.values()).reduce((list, module) => [ ...list, ...module ], []));
  }
};

const files = fileNames.length ? fileNames : projectFiles
  .filter((path) => !path.endsWith(".d.ts"))
  .map((path) => relative(join(projectRoot, compilerOptions.baseUrl || ""), path));

if (!("rootDir" in compilerOptions)) {
  compilerOptions.rootDir = findRootDir(files);
}

export { twc, tsConfig, npm, bower, compilerOptions, compileTo, options as cli, errors, files, projectRoot, tsConfigPath, paths, cache };
