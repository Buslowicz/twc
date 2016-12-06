#!/usr/bin/env node

import { join } from "path";
import { writeFileSync } from "fs";
import * as program from "commander";

import { init, buildConfig } from "./src/builder";
import { buildHTMLModule, buildPolymerV1 } from './src/code-builders';

const CWD = process.cwd();

const globalConfig = require(join(__dirname, "tsconfig.json"));
const projectConfig = require(join(CWD, "tsconfig.json"));

const dist = join(CWD, "dist");

if (require.main === module) {
  program
    .version('0.0.3', '-v')
    .parse(process.argv);

  init({ globalConfig, projectConfig, dist });
  let build = buildConfig();
  build.config
    .then(config => buildHTMLModule(buildPolymerV1(config)))
    .then((out: any) => {
      writeFileSync(join(dist, `${out.name}.html`), out.src);
    });
}
