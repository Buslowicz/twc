"use strict";
const path = require("path");
const ts = require("gulp-typescript");
const del = require("del");
const gulp = require("gulp");
const tslint = require("gulp-tslint");
const rename = require("gulp-rename");
const transform = require("gulp-transform");
const runSequence = require("run-sequence");

const TSConfig = require("./tsconfig.json");
const TSOptions = Object.assign({}, TSConfig.compilerOptions, {
  // noEmitHelpers: true,
  noEmit: false,
  typescript: require("typescript")
});

const es6Project = ts.createProject(Object.assign({}, TSOptions, {target: "es2015"}));
const es5Project = ts.createProject(Object.assign({}, TSOptions, {target: "es5"}));

const dest = TSConfig.compilerOptions.outDir;
const src = TSConfig.files;
const include = TSConfig.include;

function buildConfig(projectConfig, dest) {
  const project = gulp.src(include.concat(src)).pipe(projectConfig());
  if (dest) {
    return project.pipe(gulp.dest(path.join(dest, dest)));
  }
  else {
    return project;
  }
}

gulp.task("clean", done => del([path.join(dest, "**")], done));

gulp.task("lint", () => gulp.src(include.concat(src)).pipe(tslint({formatter: "prose"})).pipe(tslint.report()));

gulp.task("buildHTML", () => {
  const project = buildConfig(es5Project);
  return project
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
      return Buffer.from(
        links.map(module => `<link rel="import" href="${module}">\n`).join("") +
        scripts.map(module => `<script src="${module}"></script>\n`).join("") +
        `<script>\n${content}\n</script>`
      );
    }))
    .pipe(rename({extname: ".html"}))
    .pipe(gulp.dest(path.join(dest, "html")));
});

gulp.task("buildES5", () => buildConfig(es5Project, "node"));

gulp.task("buildES6", () => buildConfig(es6Project, "es6"));

gulp.task("build", done => runSequence("clean", "lint", "buildES5", "buildES6", "buildHTML", done));

gulp.task("default", () => {
  // return [ "build" ];
  console.log(process.cwd());
});
