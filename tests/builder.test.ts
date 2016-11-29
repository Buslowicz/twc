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
    it("should create a valid config", (done) => {
      buildConfig().config.then(meta => {
        expect(meta).to.deep.equal({
          className: "ElementName",
          parent: undefined,
          properties: [
            { name: "greetings", type: "Array" },
            {
              readonly: true,
              name: "test",
              type: "String",
              defaultValue: `"tester"`
            },
            { name: "profile", type: "any" }
          ],
          methods: [],
          generatedName: null,
          decorators: {},
          annotations: {},
          src: [
            '"use strict";',
            'require("link!bower_components/polymer/polymer.html");',
            'require("link!node_modules/easy-polymer/dist/esp.html");',
            'class ElementName {',
            '    constructor() {',
            '        this.test = "tester";',
            '    }',
            '}',
            'exports.ElementName = ElementName;'
          ].join('\n')
        });
        done();
      }).catch(done);
    });
  });
});
/*
 { className: 'ElementName',
 parent: undefined,
 properties:
 [ { name: 'greetings', type: 'Array' },
 { readonly: true,
 name: 'test',
 type: 'String',
 defaultValue: '"tester"' },
 { name: 'profile', type: 'any' } ],
 methods: [],
 generatedName: undefined,
 decorators: {},
 annotations: {},
 src: 'class ElementName {\n    constructor() {\n        this.test = "tester";\n    ' }
 */