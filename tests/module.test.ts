import { expect } from "chai";
import { readFileSync } from "fs";

describe("module builder", () => {
  function moduleTests(esVersion: number) {
    return () => {
      before(() => {
        inputMathMeta = new Module(
          `${__dirname}/assets/input-math.ts`,
          readFileSync(`${__dirname}/assets/input-math.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.js`, "utf8"),
          { bowerDir: "./imports" }
        );

        elementNameMeta = new Module(
          `${__dirname}/assets/element-name.ts`,
          readFileSync(`${__dirname}/assets/element-name.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.js`, "utf8"),
          { bowerDir: "./imports" }
        );

        noTemplateMeta = new Module(
          `${__dirname}/assets/no-template.ts`,
          readFileSync(`${__dirname}/assets/no-template.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/no-template.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/no-template.js`, "utf8"),
          { bowerDir: "./imports" }
        );

        notifyComputedMeta = new Module(
          `${__dirname}/assets/notify-computed.ts`,
          readFileSync(`${__dirname}/assets/notify-computed.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/notify-computed.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/notify-computed.js`, "utf8"),
          { bowerDir: "./imports" }
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
        expect(notifyComputedMeta.toString(1)).to.equalIgnoreSpaces(
          readFileSync(`${__dirname}/assets/es${esVersion}out/notify-computed.p1.html`, "utf8")
        );
      });
    };
  }

  describe("ES5", moduleTests(5));
  describe("ES6", moduleTests(6));
});
