import { findClosing, split } from "../helpers/source-crawlers";

import * as definedAnnotations from "../annotations";
import { DTSParser } from './DTSParser';

export class JSParser extends DTSParser {
  public helperClassName: string;
  public classBodyPosition: {start: number; end: number};
  public decorators: Array<Decorator> = [];
  public annotations: Array<Decorator> = [];

  protected jsSrc: string;
  protected isES6: boolean;

  protected options: JSParserOptions = {
    allowDecorators: false
  };

  constructor(dts: string, js: string, options?: JSParserOptions) {
    super(dts, options);
    this.jsSrc = js;
    Object.assign(this.options, options);

    /********** get class body position **********/
    this.findClassBody();

    /********** get constructor position **********/
    const { start, end } = this.findConstructor();

    if (start !== -1) {
      (this.methods.get("constructor") || <any>{}).body = (<any> this.jsSrc)
        .slice(this.jsSrc.indexOf("(", start), end + 1)
        .replace(...this.getDefaultValues());
    }

    /********** get method bodies **********/
    this.jsSrc = (<any> this.jsSrc)
      .replace(...this.getMethodBodies())

      /********** get decorators and remove them if needed **********/
      .replace(...this.removeExtend())
      .replace(...this.getFieldDecorators())
      .replace(...this.getClassDecorators());
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
  findClassBody(): void {
    let matchES5 = this.jsSrc.match(new RegExp(`var ${this.className} = \\(function \\((?:_super)?\\) {`));
    let matchES6 = this.jsSrc.match(new RegExp(`(?:let ${this.className} = (${this.className}[\\S]*) = )?class ${this.className}(?: extends .+?)? {`));

    let start, end;
    let match;

    if (matchES5) {
      this.isES6 = false;
      match = matchES5;
    }
    else if (matchES6) {
      this.isES6 = true;
      match = matchES6;
    }
    else {
      throw new Error("no class found");
    }

    let { 0: line, 1: generatedName, index } = match;
    start = index;

    end = findClosing(this.jsSrc, start + line.length, "{}");
    if (!this.isES6) {
      end = findClosing(this.jsSrc, this.jsSrc.indexOf("(", end), "()");
    }
    end = this.jsSrc.indexOf(";", end);

    this.helperClassName = generatedName;
    this.classBodyPosition = { start, end };
  }

  /**
   * Return pattern and replacer function to find default values
   *
   * @returns RegExp pattern and replacer function
   */
  getDefaultValues(): Replacer {
    let testPrimitive = /(true|false|^".*"$|^'.*'$|^`.*`$|\d+)/;

    if (this.properties.size === 0) {
      return [ /^$/, "" ];
    }
    return [
      new RegExp(`[\\t ]*_?this\\.(${Array.from(this.properties.values())
        .map(itm => itm.name)
        .join("|")}) = (.*);\\n`, "g"),
      (_, name, value) => {
        let config = this.properties.get(name);
        config.value = value;
        config.isPrimitive = testPrimitive.test(value);
        return ""
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
        : new RegExp(`(${this.className}.prototype.(${methodsList}) = function ?)\\(.*?\\) {`, "g"),
      (_, boiler, name, index) => {
        let end = findClosing(this.jsSrc, this.jsSrc.indexOf("{", <any> index + boiler.length), "{}");
        this.methods.get(name).body = this.jsSrc.slice(<any> index + boiler.length, end + 1).trim();
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
      new RegExp(`__extends(${this.className}, _super);`),
      ""
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
      (_, definition, proto, name, descriptor) => {
        let usedDecorators: Array<Decorator> = [];
        let usedAnnotations: Array<Decorator> = [];

        definition = definition.trim();

        // get each decorator name and execution params
        for (let decors = split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
          let decor = decors[ i ];
          let ptr = decor.indexOf("(");
          let [name, params = undefined] = ptr !== -1 ? [
            decor.slice(0, ptr),
            decor.slice(ptr + 1, decor.length - 1)
          ] : [ decor ];
          if (name in definedAnnotations) {
            usedAnnotations.push({ name, params, descriptor, src: decor });
          }
          else {
            usedDecorators.push({ name, params, descriptor, src: decor });
          }
        }

        let config = this.methods.get(name) || this.properties.get(name);
        if (usedDecorators.length > 0) {
          config.decorators = usedDecorators;
        }
        if (usedAnnotations.length > 0) {
          config.annotations = usedAnnotations;
        }

        if (!this.options.allowDecorators || usedDecorators.length === 0) {
          return "";
        }
        return `\n__decorate([${usedDecorators.map(n => n.src).toString()}], ${proto}, "${name}", ${descriptor});`
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
          let [name, params = undefined] = ptr !== -1 ? [
            decor.slice(0, ptr),
            decor.slice(ptr + 1, decor.length - 1)
          ] : [ decor ];
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
          .toString()}], ${this.className});`
      }
    ];
  }
}
