import { parse } from "path";
import * as through2 from "through2";
import Module from "./PolymerModule";

export class StreamParser {
  private map: { [filename: string]: FileSources } = {};

  constructor(private polymerVersion: number, private defaultTarget: any, private bowerDir: string) {}

  public get tsConfig() {
    return {
      typescript: require("typescript"),
      declaration: true,
      experimentalDecorators: true,
      module: "commonjs",
      noEmit: false,
      target: <ts.ScriptTarget> (this.polymerVersion === 2 ? "es6" : this.defaultTarget || "es5")
    };
  }

  public collectSources() {
    return through2.obj((file, enc, next) => {
      if (!file.path.endsWith(".d.ts")) {
        this.map[ parse(file.path).name ] = { src: file };
      }
      next(null, file);
    });
  }

  public generateOutput() {
    const that = this;
    return through2.obj(function (file, enc, next) {
      const getSrc = (vinyl) => vinyl.contents.toString();
      let { ext, name } = parse(file.path);
      if (name.endsWith(".d")) {
        name = name.slice(0, -2);
      }
      const srcs = Object.assign(that.map[ name ], { [ ext ]: file });

      if (srcs[ ".js" ] && srcs[ ".ts" ]) {
        delete that.map[ name ];

        const path = srcs[ ".js" ].path.replace(/js$/, "html");
        const options: JSParserOptions = {
          allowDecorators: false,
          polymerVersion: that.polymerVersion,
          bowerDir: that.bowerDir
        };
        const out = new Module(path, getSrc(srcs.src), getSrc(srcs[ ".ts" ]), getSrc(srcs[ ".js" ]), options);

        srcs[ ".js" ].contents = out.toBuffer(Number(that.polymerVersion));
        srcs[ ".js" ].path = path;

        this.push(srcs[ ".js" ]);
        this.push(srcs[ ".ts" ]);
      }
      next();
    });
  }
}
