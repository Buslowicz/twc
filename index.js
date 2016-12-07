#!/usr/bin/env node
"use strict";
const path_1 = require("path");
const fs_1 = require("fs");
const program = require("commander");
const builder_1 = require("./src/builder");
const code_builders_1 = require('./src/code-builders');
const CWD = process.cwd();
const globalConfig = require(path_1.join(__dirname, "tsconfig.json"));
const projectConfig = require(path_1.join(CWD, "tsconfig.json"));
const dist = path_1.join(CWD, "dist");
if (require.main === module) {
    program
        .version('0.0.3', '-v')
        .parse(process.argv);
    builder_1.init({ globalConfig, projectConfig, dist });
    let build = builder_1.buildConfig();
    build.config
        .then(config => code_builders_1.buildHTMLModule(code_builders_1.buildPolymerV1(config)))
        .then((out) => {
        fs_1.writeFileSync(path_1.join(dist, `${out.name}.html`), out.src);
    });
}
//# sourceMappingURL=index.js.map