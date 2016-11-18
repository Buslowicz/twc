#!/usr/bin/env node

"use strict";
const path = require("path");
const program = require("commander");

const pcc = require("./src/lib");

const CWD = process.cwd();

const globalConfig = require(path.join(__dirname, "tsconfig.json"));
const projectConfig = require(path.join(CWD, "tsconfig.json"));


let dist = path.join(CWD, "dist");
let src = (projectConfig.files || [])
  .concat(projectConfig.include || [])
  .map(src => path.join(CWD, src));

if (require.main === module) {
  program
    .version('0.0.3', '-v')
    .parse(process.argv);

  pcc.init({globalConfig, projectConfig, src, dist});
  pcc.build();
}
