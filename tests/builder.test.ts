import { expect } from "chai";
import { join } from "path";
import { buildConfig, init } from '../src/builder';
import { buildPolymerV1 } from '../src/code-builders';

describe("module builder", () => {
  before(() => {
    let root = join(__dirname, "..");
    let config = require(join(root, "tsconfig.json"));
    config.compilerOptions.declaration = true;
    let dist = join(root, "dist");
    let src = join(root, "tests", "assets", "element-name.ts");
    init({ globalConfig: config, projectConfig: config, dist, src });
  });

  describe("buildConfig", () => {
    it("should create a valid config", function (done) {
      // this is a huge test (reads data from file) which should not exceed 2s, but on slower machines it might
      this.timeout(3000);

      buildConfig().config
        .then(meta => {
          console.log("def:", buildPolymerV1(meta.className, meta.properties, meta.methods));
          return meta;
        })
        .then(meta => {
        expect(meta.className).to.equal("ElementName");
        expect(meta.classBody).to.deep.equal([ 126, 594 ]);
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
          '    observer(val) {',
          '        console.log("val:", val);',
          '    }',
          '    observerAuto(greetings) {',
          '        console.log("greetings:", greetings);',
          '    }',
          '    computedProp(val) {',
          '        console.log(val);',
          '        return val + "!";',
          '    }',
          '    computedPropAuto(test) {',
          '        console.log("test:", test);',
          '        return test + "!";',
          '    }',
          '}',
          'exports.ElementName = ElementName;',
          ''
        ].join('\n'));
        expect(Array.from(meta.methods.values())).to.deep.equal([
          {
            annotations: [
              {
                descriptor: "null",
                name: "observe",
                params: "\"profile.prop\"",
                src: "observe(\"profile.prop\")"
              }
            ],
            body: "(val) {\n        console.log(\"val:\", val);\n    }",
            name: "observer",
            params: [
              {
                name: "val",
                type: "String"
              }
            ],
            type: "void"
          },
          {
            annotations: [
              {
                descriptor: "null",
                name: "observe",
                params: undefined,
                src: "observe"
              }
            ],
            body: "(greetings) {\n        console.log(\"greetings:\", greetings);\n    }",
            name: "observerAuto",
            params: [
              {
                name: "greetings",
                type: "Array"
              }
            ],
            type: "void"
          },
          {
            annotations: [
              {
                descriptor: "null",
                name: "computed",
                params: "\"test\"",
                src: "computed(\"test\")"
              }
            ],
            body: "(val) {\n        console.log(val);\n        return val + \"!\";\n    }",
            name: "computedProp",
            params: [
              {
                name: "val",
                type: "String"
              }
            ],
            type: "String"
          },
          {
            annotations: [
              {
                descriptor: "null",
                name: "computed",
                params: undefined,
                src: "computed"
              }
            ],
            body: "(test) {\n        console.log(\"test:\", test);\n        return test + \"!\";\n    }",
            name: "computedPropAuto",
            params: [
              {
                name: "test",
                type: "String"
              }
            ],
            type: "String"
          }
        ]);
        expect(Array.from(meta.properties.values())).to.deep.equal([
          {
            annotations: [
              {
                descriptor: "void 0",
                name: "attr",
                params: undefined,
                src: "attr"
              }
            ],
            name: "greetings",
            type: "Array"
          },
          {
            readonly: true,
            isPrimitive: true,
            name: "test",
            type: "String",
            value: `"tester"`
          },
          {
            annotations: [
              {
                descriptor: "void 0",
                name: "notify",
                params: undefined,
                src: "notify"
              }
            ],
            name: "profile",
            type: "any"
          }
        ]);
        done();
      }).catch(done);
    });
  });
});
