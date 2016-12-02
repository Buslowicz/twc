"use strict";
const path = require("path");
const ts = require("gulp-typescript");
const del = require("del");
const gulp = require("gulp");
const rename = require("gulp-rename");
const parser_1 = require("./parser");
const transform = require("gulp-transform");
const tslint = require("gulp-tslint");
const CWD = process.cwd();
let globalTSConfig;
let projectTSConfig;
let project;
let dest;
let srcs;
function init({ globalConfig = require(path.join(__dirname, "tsconfig.json")), projectConfig = require(path.join(CWD, "tsconfig.json")), dist = path.join(CWD, "dist"), src }) {
    globalTSConfig = globalConfig;
    projectTSConfig = projectConfig;
    dest = dist;
    srcs = src || (projectConfig.files || []).concat(projectConfig.include || []).map(src => path.join(CWD, src));
    project = ts.createProject(Object.assign({}, globalConfig.compilerOptions, projectConfig.compilerOptions, { noEmit: false }));
}
exports.init = init;
function clean() {
    return del([dest]);
}
exports.clean = clean;
function lint() {
    //noinspection JSCheckFunctionSignatures
    return new Promise((resolve, reject) => gulp
        .src(srcs)
        .pipe(tslint({ formatter: "prose" }))
        .pipe(tslint.report())
        .on("end", resolve)
        .on("error", reject));
}
exports.lint = lint;
function buildHTML() {
    return new Promise((resolve, reject) => {
        const stream = gulp
            .src(srcs)
            .pipe(project());
        stream.js
            .pipe(transform(content => {
            let links = [];
            let scripts = [];
            content = content
                .toString()
                .replace(/require\(['"](link|script)!(.*?)['"]\);\n?/g, (m, type, module) => {
                switch (type) {
                    case "link":
                        links.push(module);
                        break;
                    case "script":
                        scripts.push(module);
                        break;
                }
                return "";
            });
            return Buffer.from(links.map(module => `<link rel="import" href="${module}">\n`).join("") +
                scripts.map(module => `<script src="${module}"></script>\n`).join("") +
                "<script>\n" + content + "\n</script>");
        }))
            .pipe(rename({ extname: ".html" }))
            .pipe(gulp.dest(dest))
            .on("end", resolve)
            .on("error", reject);
    });
}
exports.buildHTML = buildHTML;
function build() {
    clean()
        .then(lint)
        .then(buildHTML);
}
exports.build = build;
function parse([dtsSrc, jsSrc]) {
    let dtsMeta = parser_1.parseDTS(dtsSrc.contents.toString());
    let jsMeta = parser_1.parseJS(jsSrc.contents.toString(), dtsMeta, { definedAnnotations: ["test"] });
    return Object.assign({}, dtsMeta, jsMeta);
}
exports.parse = parse;
function streamToPromise(stream) {
    return new Promise((resolve, reject) => stream.on("data", src => resolve(src)).on("error", err => reject(err)));
}
exports.streamToPromise = streamToPromise;
function buildConfig() {
    let stream = gulp
        .src(srcs)
        .pipe(project());
    let dts = streamToPromise(stream.dts);
    let js = streamToPromise(stream.js);
    return {
        dts, js,
        config: Promise.all([dts, js]).then(parse)
    };
}
exports.buildConfig = buildConfig;
//# sourceMappingURL=builder.js.map