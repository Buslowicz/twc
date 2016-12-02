import { split, findClosing } from './source-crawlers';

/**
 * Return pattern and replacer function to find field level decorators
 *
 * @param definedAnnotations Available field annotations
 * @param decorators List of run-time decorators
 * @param annotations List of design-time annotations
 * @param className Name of the class
 *
 * @returns RegExp pattern and replacer function
 */
export function getFieldDecorators({ definedAnnotations, decorators, annotations, className }: {
  definedAnnotations: Array<string>;
  decorators: DecoratorsMap;
  annotations: DecoratorsMap;
  className: string;
}): Replacer {
  return [
    new RegExp(`[\\s]*__decorate\\(\\[([\\W\\w]*?)], (${className}\\.prototype), "(.*?)", (.*?)\\);`, "g"),
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
        if (definedAnnotations.indexOf(name) !== -1) {
          usedAnnotations.push({ name, params, descriptor, src: decor });
        }
        else {
          usedDecorators.push({ name, params, descriptor, src: decor });
        }
      }

      decorators[ name ] = usedDecorators;
      annotations[ name ] = usedAnnotations;

      if (usedDecorators.length === 0) {
        return "";
      }
      return `\n__decorate([${usedDecorators.map(n => n.src).toString()}], ${proto}, "${name}", ${descriptor});`
    }
  ];
}

/**
 * Return pattern and replacer function to find class level decorators
 *
 * @param definedAnnotations Available field annotations
 * @param decorators List of run-time decorators
 * @param annotations List of design-time annotations
 * @param className Name of the class
 * @param generatedName Generated helper name
 *
 * @returns RegExp pattern and replacer function
 */
export function getClassDecorators({ definedAnnotations, decorators, annotations, className, generatedName }: {
  definedAnnotations: Array<string>;
  decorators: DecoratorsMap;
  annotations: DecoratorsMap;
  className: string;
  generatedName: string;
}): Replacer {
  return [
    new RegExp(`[\\s]*${className} = (?:.*? = )?__decorate\\(\\[([\\W\\w]*?)], (${className})\\);`, "g"),
    (_, definition) => {
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
        if (definedAnnotations.indexOf(name) !== -1) {
          usedAnnotations.push({ name, params, src: decor });
        }
        else {
          usedDecorators.push({ name, params, src: decor });
        }
      }

      decorators[ "class" ] = usedDecorators;
      annotations[ "class" ] = usedAnnotations;

      if (usedDecorators.length === 0) {
        return "";
      }
      if (generatedName) {
        generatedName += " = ";
      }
      else {
        generatedName = "";
      }
      return `\n${className} = ${generatedName}__decorate([${usedDecorators.map(n => n.src)
        .toString()}], ${className});`
    }
  ];
}

/**
 * Return pattern and replacer function to find method bodies
 *
 * @param src Parsed source
 * @param methods List of methods config
 * @param isES6
 * @param className Name of the class
 *
 * @returns RegExp pattern and replacer function
 */
export function getMethodBodies({ src, methods, isES6, className }: {
  src: string;
  methods: FieldConfigMap;
  isES6: boolean;
  className: string;
}): Replacer {
  let methodsList = Array.from(methods.values()).map(itm => itm.name).join("|");

  return [
    isES6
      ? new RegExp(`((${methodsList}))\\(.*?\\) {`, "g")
      : new RegExp(`(${className}.prototype.(${methodsList}) = function ?)\\(.*?\\) {`, "g"),
    (_, boiler, name, index) => {
      let end = findClosing(src, src.indexOf("{", <any> index + boiler.length), "{}");
      methods.get(name).body = src.slice(<any> index + boiler.length, end + 1).trim();
      return _;
    }
  ];
}

/**
 * Return pattern and replacer function to find default values
 *
 * @param properties List of properties config
 *
 * @returns RegExp pattern and replacer function
 */
export function getDefaultValues({ properties }: { properties: FieldConfigMap; }): Replacer {
  return [
    new RegExp(`this\\.(${Array.from(properties.values()).map(itm => itm.name).join("|")}) = (.*);\\n`, "g"),
    (_, name, value) => {
      console.log(properties, name, properties[ name ], value);
      return properties.get(name).defaultValue = value;
    }
  ];
}

/**
 * Remove __extend helper from ES5
 *
 * @param className Name of the class
 *
 * @returns RegExp pattern and replacer function
 */
export function removeExtend({ className }: { className: string; }): Replacer {
  return [
    new RegExp(`__extends(${className}, _super);`),
    ""
  ];
}

/**
 * Find class source start index, end index, generated helper name and flag if source is ES6 (class based)
 *
 * @param src String to search
 * @param className Name of the class to find
 *
 * @returns Position of class in source and info is this ES6 class and generated helper name
 */
export function findClassBody({ src, className }: {
  src: string;
  className: string;
}): PositionInSource & { isES6: boolean; generatedName: string } {
  let matchES5 = src.match(new RegExp(`var ${className} = \\(function \\((?:_super)?\\) {`));
  let matchES6 = src.match(new RegExp(`(?:let (${className}[\\S]*) = )?class ${className}(?: extends .+?)? {`));
  let isES6;

  let start, end;
  let match;

  if (matchES5) {
    isES6 = false;
    match = matchES5;
  }
  else if (matchES6) {
    isES6 = true;
    match = matchES6;
  }
  else {
    throw new Error("no class found");
  }

  let { 0: line, 1: generatedName, index } = match;
  start = index;

  end = findClosing(src, start + line.length, "{}");
  if (!isES6) {
    end = findClosing(src, src.indexOf("(", end), "()");
  }
  end = src.indexOf(";", end);

  return { isES6, start, end, generatedName };
}

/**
 * Find constructor position in source
 *
 * @param src String to search
 * @param className Name of the class to find
 * @param isES6 Flag to indicate if we deal with ES6 class
 * @param classStart Starting position of the class body
 *
 * @returns Position of constructor in source
 */
export function findConstructor({ src, className, isES6, classStart }: {
  src: string;
  className: string;
  isES6: boolean;
  classStart: number;
}): PositionInSource {
  let constructorPattern = isES6 ? `constructor(` : `function ${className}(`;
  let start = src.indexOf(constructorPattern, classStart);
  let end = findClosing(src, start + constructorPattern.length - 1, "()");
  end = src.indexOf("{", end);
  end = findClosing(src, end, "{}");
  return { start, end };
}
