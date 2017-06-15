import { readFileSync, writeFileSync } from "fs";
import { createSourceFile, ScriptTarget, SourceFile } from "typescript";
import { Module } from "../src/builder";

describe("analyzer", () => {
  it("should analyze the source file and build the proper output", () => {
    const fileName = "tests/samples/complex.ts";
    const content = readFileSync(fileName).toString();
    const source: SourceFile = createSourceFile(fileName, content, ScriptTarget.ES2015, true);

    writeFileSync("tests/test.html", new Module(source, "Polymer1"));
  });
});
