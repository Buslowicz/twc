#!/usr/bin/env node
"use strict";
const path_1 = require("path");
const program = require("commander");
const CWD = process.cwd();
const globalConfig = require(path_1.join(__dirname, "tsconfig.json"));
const projectConfig = require(path_1.join(CWD, "tsconfig.json"));
const dist = path_1.join(CWD, "dist");
if (require.main === module) {
    program
        .version('0.0.3', '-v')
        .parse(process.argv);
}
//# sourceMappingURL=index.js.map