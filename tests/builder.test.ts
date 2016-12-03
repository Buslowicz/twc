import { expect } from "chai";
import { join } from "path";
import { buildConfig, init } from '../src/builder';

describe("module builder", () => {
  before(() => {
    let root = join(__dirname, "..");
    let config = require(join(root, "tsconfig.json"));
    let dist = join(root, "dist");
    let src = join(root, "tests", "assets", "element-name.ts");
    init({ globalConfig: config, projectConfig: config, dist, src });
  });

  describe("buildConfig", () => {
    it("should create a valid config", function (done) {
      // this is a huge test (reads data from file) which should not exceed 2s, but on slower machines it might
      this.timeout(3000);

      buildConfig().config.then(meta => {
        expect(meta.className).to.equal("ElementName");
        expect(meta.classBody).to.deep.equal([ 126, 295 ]);
        expect(meta.parent).to.equal(undefined);
        expect(meta.generatedName).to.equal(undefined);
        expect(meta.decorators).to.deep.equal([]);
        expect(meta.annotations).to.deep.equal([]);
        expect(meta.src).to.equal([
          '"use strict";',
          'require("link!bower_components/polymer/polymer.html");',
          'require("link!node_modules/easy-polymer/dist/esp.html");',
          'class ElementName {',
          '    constructor() {',
          '        this.test = "tester";',
          '    }',
          '    tester(val) {',
          '        console.log("val:", val);',
          '    }',
          '}',
          'exports.ElementName = ElementName;',
          ''
        ].join('\n'));
        expect(Array.from(meta.methods.values())).to.deep.equal([
          {
            body: "(val) {\n        console.log(\"val:\", val);\n    }",
            name: "tester",
            params: [
              {
                name: "val",
                type: "String"
              }
            ],
            type: "void"
          }
        ]);
        expect(Array.from(meta.properties.values())).to.deep.equal([
          { name: "greetings", type: "Array" },
          {
            readonly: true,
            isPrimitive: true,
            name: "test",
            type: "String",
            value: `"tester"`
          },
          { name: "profile", type: "any" }
        ]);
        done();
      }).catch(done);
    });
  });
});
