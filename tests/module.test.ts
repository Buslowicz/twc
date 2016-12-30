import { use, expect } from "chai";
use(require("chai-string"));
import { readFileSync } from "fs";
import Module from "../src/PolymerModule";

describe("module builder", () => {
  function moduleTests(esVersion: number) {
    return () => {
      let inputMathMeta: Module;
      let elementNameMeta: Module;
      let noTemplateMeta: Module;
      before(() => {
        inputMathMeta = new Module(
          `${__dirname}/assets/es${esVersion}out`,
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.js`, "utf8")
        );

        elementNameMeta = new Module(
          `${__dirname}/assets/es${esVersion}out`,
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.js`, "utf8")
        );

        noTemplateMeta = new Module(
          `${__dirname}/assets/es${esVersion}out`,
          readFileSync(`${__dirname}/assets/es${esVersion}out/no-template.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/no-template.js`, "utf8")
        );
      });

      it("should generate a valid Polymer v1 module", () => {
        expect(noTemplateMeta.toString(1)).to.be.equalIgnoreSpaces(
          readFileSync(`${__dirname}/assets/es${esVersion}out/no-template.p1.html`, "utf8")
        );
        expect(inputMathMeta.toString(1)).to.be.equalIgnoreSpaces(
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.p1.html`, "utf8")
        );
        expect(elementNameMeta.toString(1)).to.equalIgnoreSpaces(
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.p1.html`, "utf8")
        );
      });
    };
  }

  describe("ES5", moduleTests(5));
  describe("ES6", moduleTests(6));
});
