/// <reference path="polymer.d.ts"/>
/// <reference path="polymer.decorators.d.ts"/>

import { CompilerOptions, JSDoc } from "typescript";

export interface Constructor<T = {}> {
  new (...args: any[]): T;
}

export interface HasJSDoc {
  jsDoc?: Array<JSDoc>;
}

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
