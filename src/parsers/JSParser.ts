import { findClosing, split } from "../helpers/source-crawlers";

import * as definedAnnotations from "../annotations";
import DTSParser from "./DTSParser";

export default class JSParser extends DTSParser {
  public helperClassName: string;
  public classBodyPosition: { start: number; end: number };
  public decorators: Array<Decorator> = [];
  public annotations: Array<Decorator> = [];

  public jsdoc: string;

  public links: Array<string> = [];
  public scripts: Array<string> = [];

  protected jsSrc: string;
  protected isES6: boolean;

  protected options: JSParserOptions = {
    allowDecorators: false
  };

  constructor(dts: string, js: string, options?: JSParserOptions) {
    super(dts, options);
    this.jsSrc = js;
    Object.assign(this.options, options);

    /* ********* get class body position ********* */
    this.findClassBody();

    /* ********* get constructor position ********* */
    const { start, end } = this.findConstructor();

    let constructor;
    if (start !== -1) {
      (constructor = this.methods.get("constructor") || <any>{}).body = (<any> this.jsSrc)
        .slice(this.jsSrc.indexOf("(", start), end + 1)
        .replace(...this.getDefaultValues());
    }

    if (constructor) {
      this.jsSrc = [
        this.jsSrc.slice(0, start),
        (this.isES6 ? `constructor` : `function ${this.className}`),
        constructor.body,
        this.jsSrc.slice(end + 1)
      ].join("");
    }

    /* ********* get method bodies ********* */
    this.jsSrc = (<any> this.jsSrc)
      .replace(...this.getImports())
      .replace(...this.getClassJsDoc())
      .replace(...this.getMethodBodies())

      /* ********* get decorators and remove them if needed ********* */
      .replace(...this.removeExtend())
      .replace(...this.removeExports())
      .replace(...this.getFieldDecorators())
      .replace(...this.getClassDecorators());

    // since last check, source has been modified, so we need to find class body position again
    this.findClassBody(this.isES6 ? 6 : 5);
  }

  /**
   * Find constructor position in source
   *
   * @returns Position of constructor in source
   */
  findConstructor(): PositionInSource {
    let constructorPattern = this.isES6 ? `constructor(` : `function ${this.className}(`;
    let start = this.jsSrc.indexOf(constructorPattern, this.classBodyPosition.start);
    if (start === -1) {
      return { start: -1, end: -1 };
    }
    let end = findClosing(this.jsSrc, start + constructorPattern.length - 1, "()");
    end = this.jsSrc.indexOf("{", end);
    end = findClosing(this.jsSrc, end, "{}");
    return { start, end };
  }

  /**
   * Find class source start index, end index, generated helper name and flag if source is ES6 (class based)
   *
   * @throws Error if no class was found
   */
  findClassBody(refreshWithESVersion?: number): void {
    const generatedNamePattern = `(?:(${this.className}[\\S]*) = )?`;
    const patterns = {
      5: new RegExp(`(var ${this.className} = ${generatedNamePattern})?\\(function \\((?:_super)?\\) {`),
      6: new RegExp(`(let ${this.className} = ${generatedNamePattern})?class ${this.className}(?: extends .+?)? {`)
    };

    let start, end;
    let match;

    if (refreshWithESVersion) {
      match = this.jsSrc.match(patterns[ refreshWithESVersion ]);
    }
    else if ((match = this.jsSrc.match(patterns[ 5 ]))) {
      this.isES6 = false;
    }
    else if ((match = this.jsSrc.match(patterns[ 6 ]))) {
      this.isES6 = true;
    }
    else {
      throw new Error("no class found");
    }

    let { 0: line, 1: hasVar, 2: generatedName, index } = match;
    start = index;

    end = findClosing(this.jsSrc, start + line.length, "{}");
    if (!this.isES6) {
      end = findClosing(this.jsSrc, this.jsSrc.indexOf("(", end), "()");
    }
    if (!this.isES6 || hasVar) {
      end = this.jsSrc.indexOf(";", end);
    }

    this.helperClassName = generatedName;
    this.classBodyPosition = { start, end };
  }

  getImports(): Replacer {
    return [
      /(?:(var|const) \S+ = )?(?:require|import) ?\(?['"](.*?)['"]\)?;\n?/g,
      (m, v, module) => {
        if (module.startsWith("link!")) {
          this.links.push(module.substr(5));
        }
        else if (module.startsWith("script!")) {
          this.scripts.push(module.substr(7));
        }
        return "";
      }
    ];
  }

  getClassJsDoc(): Replacer {
    return [
      new RegExp(`(\\/\\*\\*(?:(?!\\/\\*\\*)[\\s\\S])+\\*\\/)([\\s]*(?:let|var|class) ${this.className})`),
      (m, c, d) => {
        this.jsdoc = c.split(/\r?\n/).slice(1, -1).map(doc => doc.replace(/^\s*\*\s*/, "")).join("\n");
        return d;
      }
    ];
  }

  /**
   * Return pattern and replacer function to find default values
   *
   * @returns RegExp pattern and replacer function
   */
  getDefaultValues(): Replacer {
    let testPrimitive = /^(null|undefined|true|false|".*"|'.*'|`.*`|[\d.ex+*-/]+)$/;
    if (this.properties.size === 0) {
      return [ /^$/, "" ];
    }
    let propsList = Array.from(this.properties.values())
      .map(itm => itm.name)
      .join("|");

    return [
      new RegExp(`[\\t ]*_?this\\.(${propsList}) = ([\\S\\s]*?);`, "g"),
      (_, name, value) => {
        let config = this.properties.get(name);
        config.value = value;
        config.isPrimitive = testPrimitive.test(value);
        return "";
      }
    ];
  }

  /**
   * Return pattern and replacer function to find method bodies
   *
   * @returns RegExp pattern and replacer function
   */
  getMethodBodies(): Replacer {
    if (this.methods.size === 0) {
      return [ /^$/, "" ];
    }
    let methodsList = Array
      .from(this.methods.values())
      .map(itm => itm.name)
      .filter(method => method !== "constructor")
      .join("|");

    return [
      this.isES6
        ? new RegExp(`((${methodsList}))\\(.*?\\) {`, "g")
        : new RegExp(`(${this.className}(?:.prototype)?.(${methodsList}) = function ?)\\(.*?\\) {`, "g"),
      (_, boiler, name, index, jsSrc) => {
        let offset = <any> index + boiler.length;
        let end = findClosing(jsSrc, jsSrc.indexOf("{", offset - 1), "{}");
        this.methods.get(name).body = jsSrc.slice(offset, end + 1).trim();
        return _;
      }
    ];
  }

  /**
   * Remove __extend helper from ES5
   *
   * @returns RegExp pattern and replacer function
   */
  removeExtend(): Replacer {
    return [
      new RegExp(`__extends(${this.className}, _super);`), ""
    ];
  }

  // noinspection JSMethodCanBeStatic
  removeExports(): Replacer {
    return [
      /exports\.[\S]+ = [\S]+?;/, ""
    ];
  }

  /**
   * Return pattern and replacer function to find field level decorators
   *
   * @returns RegExp pattern and replacer function
   */
  getFieldDecorators(): Replacer {
    return [
      new RegExp(`[\\s]*__decorate\\(\\[([\\W\\w]*?)], (${this.className}\\.prototype), "(.*?)", (.*?)\\);`, "g"),
      (_, definition, proto, propName, descriptor) => {
        let usedDecorators: Array<Decorator> = [];
        let usedAnnotations: Array<Decorator> = [];

        definition = definition.trim();

        // get each decorator name and execution params
        for (let decors = split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
          let decor = decors[ i ];
          let ptr = decor.indexOf("(");
          let [ name, params = undefined ] = ptr !== -1 ? [
              decor.slice(0, ptr).split(".").slice(-1)[ 0 ],
              decor.slice(ptr + 1, decor.length - 1)
            ] : [ decor.split(".").slice(-1)[ 0 ] ];

          if (name in definedAnnotations) {
            usedAnnotations.push({ name, params, descriptor, src: decor });
          }
          else {
            usedDecorators.push({ name, params, descriptor, src: decor });
          }
        }

        let config = this.methods.get(propName) || this.properties.get(propName);
        if (usedDecorators.length > 0) {
          config.decorators = usedDecorators;
        }
        if (usedAnnotations.length > 0) {
          config.annotations = usedAnnotations;
        }

        if (!this.options.allowDecorators || usedDecorators.length === 0) {
          return "";
        }
        return `\n__decorate([${usedDecorators.map(n => n.src).toString()}], ${proto}, "${propName}", ${descriptor});`;
      }
    ];
  }

  /**
   * Return pattern and replacer function to find class level decorators
   *
   * @returns RegExp pattern and replacer function
   */
  getClassDecorators(): Replacer {
    return [
      new RegExp(`[\\s]*${this.className} = (?:.*? = )?__decorate\\(\\[([\\W\\w]*?)], (${this.className})\\);`, "g"),
      (_, definition) => {

        definition = definition.trim();

        // get each decorator name and execution params
        for (let decors = split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
          let decor = decors[ i ];
          let ptr = decor.indexOf("(");
          let [ name, params = undefined ] = ptr !== -1 ? [
              decor.slice(0, ptr).split(".").slice(-1)[ 0 ],
              decor.slice(ptr + 1, decor.length - 1)
            ] : [ decor.split(".").slice(-1)[ 0 ] ];

          if (name in definedAnnotations) {
            this.annotations.push({ name, params, src: decor });
          }
          else {
            this.decorators.push({ name, params, src: decor });
          }
        }

        if (!this.options.allowDecorators || this.decorators.length === 0) {
          return "";
        }
        if (this.helperClassName) {
          this.helperClassName += " = ";
        }
        else {
          this.helperClassName = "";
        }
        return `\n${this.className} = ${this.helperClassName}__decorate([${this.decorators.map(n => n.src)
          .toString()}], ${this.className});`;
      }
    ];
  }
}
