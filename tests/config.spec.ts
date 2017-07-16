import { expect } from "chai";
import { createSourceFile, ScriptTarget } from "typescript";
import { cache, findRootDir, outPath } from "../src/config";

describe("config", () => {
  describe("findRootDir", () => {
    it("should find Longest Common Path for list of paths", () => {
      expect(findRootDir([ "some/deep/file.ts", "some/deep/awesome/file.ts", "some/deep/file.js" ])).to.equal("some/deep");
      expect(findRootDir([ "some/deep/file.ts", "some/deep/file.js" ])).to.equal("some/deep");
      expect(findRootDir([ "some/deep/file.ts", "another/file.ts" ])).to.equal("");
      expect(findRootDir([ "the/file.ts" ])).to.equal("the");
      expect(findRootDir([])).to.equal("");
      expect(findRootDir([ "file.ts", "file.js" ])).to.equal("");
      expect(findRootDir([ "file.ts", "deeper/file.js" ])).to.equal("");
    });
  });
  describe("cache", () => {

    let cachedFiles;
    before(() => {
      cachedFiles = cache.files;
      cache.files = new Map([
        [
          "sample.file", new Map([
          [
            "bower:some.html", new Map([
            [ "A", { name: "A", type: "VariableDeclaration", namespace: "NS" } ],
            [ "B", { name: "B", type: "VariableDeclaration", namespace: "NS" } ],
            [ "C", { name: "C", type: "VariableDeclaration", namespace: "NS" } ]
          ])
          ]
        ])
        ]
      ]);
    });
    after(() => {
      cache.files = cachedFiles;
    });
    it("should create a cache with sources metadata", () => {
      expect(Array.from(cache.modules.get("bower:some.html").values())).to.deep.equal([
        { name: "A", type: "VariableDeclaration", namespace: "NS" },
        { name: "B", type: "VariableDeclaration", namespace: "NS" },
        { name: "C", type: "VariableDeclaration", namespace: "NS" }
      ]);
    });
    it("should update modules if file is updated", () => {
      const source = createSourceFile("sample.file", `
      declare module "bower:some.html" {
        /**
         * @namespace NSX
         */
        export const X: {}
      }`, ScriptTarget.ES2015);
      source[ "ambientModuleNames" ] = [ "bower:some.html" ];
      cache.update(source);
      expect(Array.from(cache.modules.get("bower:some.html").values())).to.deep.equal([
        { name: "X", type: "VariableDeclaration", namespace: "NSX" }
      ]);
    });
    it("should remove module declarations if file update removed them", () => {
      const source = createSourceFile("sample.file", `export const updated = true;`, ScriptTarget.ES2015);
      source[ "ambientModuleNames" ] = [];
      cache.update(source);
      expect(cache.modules.has("bower:some.html")).to.equal(false);
    });
  });
  describe("outPath()", () => {
    it("should calculate path with no rootDir and outDir", () => {
      expect(outPath("file.ts", { rootDir: "" })).to.equal("file.ts");
      expect(outPath("deep/file.ts", { rootDir: "" })).to.equal("deep/file.ts");
    });
    it("should calculate path with rootDir set", () => {
      expect(outPath("src/file.ts", { rootDir: "src" })).to.equal("src/file.ts");
      expect(outPath("src/deep/file.ts", { rootDir: "src" })).to.equal("src/deep/file.ts");
    });
    it("should calculate path with outDir set", () => {
      expect(outPath("file.ts", { rootDir: "", outDir: "dist" })).to.equal("dist/file.ts");
      expect(outPath("deep/file.ts", { rootDir: "", outDir: "dist" })).to.equal("dist/deep/file.ts");
    });
    it("should calculate path with both rootDir and outDir set", () => {
      expect(outPath("src/file.ts", { rootDir: "src", outDir: "dist" })).to.equal("dist/file.ts");
      expect(outPath("src/deep/file.ts", { rootDir: "src", outDir: "dist" })).to.equal("dist/deep/file.ts");
      expect(outPath("src/deep/file.ts", { rootDir: "src/deep", outDir: "dist" })).to.equal("dist/file.ts");
    });
  });
});
