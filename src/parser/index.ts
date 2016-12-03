import { goTo, findClosing, regExpClosestIndexOf } from "./source-crawlers";
import { getPropertyNoType, getType, parseParams } from "./ts-parsers";
import {
  getFieldDecorators, getClassDecorators, getMethodBodies,
  getDefaultValues, removeExtend, findClassBody, findConstructor
} from "./js-parsers";
import { buildField, buildPolymerV1 } from './code-builders';

/**
 * Parse TypeScript declaration to fetch class name, super class, properties and methods names, types and modifiers
 *
 * @param src String to parse
 *
 * @throws Error if no class was found
 *
 * @returns Class name, super class, properties and methods names, types and modifiers
 */
export function parseDTS(src: string): DTSParsedData {
  let match = src.match(/[\s\n]class ([\w$_]+)(?:[\s]+extends ([^{]+))?[\s]*\{/);
  if (!match) {
    throw new Error("no class found");
  }

  const className = match[ 1 ];
  const parent = match[ 2 ];

  const properties = new Map();
  const methods = new Map();

  let start = match.index + match[ 0 ].length;

  for (
    // predefining
    let ptr = start, end = src.length, char = src.charAt(ptr);
    // condition
    ptr < end;
    // post-actions
    char = src.charAt(++ptr)
  ) {
    let params, match;
    // skip whitespace
    let from = ptr = goTo(src, /\S/, ptr);

    // is it the end of class?
    if (src.charAt(from) === "}") {
      break;
    }

    // find next stop (semicolon for the end of line, colon for end of prop name, parenthesis for end of method name
    ({ index: ptr, found: match } = regExpClosestIndexOf(src, /;|:|\(/, ptr));

    // get name and modifiers
    let { name, modifiers } = getPropertyNoType(src, from, ptr);

    // method
    if (match === "(") {
      // find end of parameters declaration
      let end = findClosing(src, ptr, "()");

      // find the colon to start searching for type
      params = parseParams(src, ptr + 1, end);

      let closing = regExpClosestIndexOf(src, /;|:/, end);

      ptr = closing.index + 1;

      if (closing.found === ";") {
        methods.set(name, buildField(modifiers, name, params));
        continue;
      }
    }
    // no type property
    else if (match === ";") {
      properties.set(name, buildField(modifiers, name));
      continue;
    }

    let { type, end: typeEnd } = getType(src, ptr + 1);
    ptr = src.indexOf(";", typeEnd);

    if (params) {
      methods.set(name, buildField(modifiers, name, params, type));
    }
    else {
      properties.set(name, buildField(modifiers, name, null, type));
    }
  }

  const deprecatedNotice = (legacy, native) => `\`${legacy}\` callback is deprecated. Please use \`${native}\` instead`;

  /********** check for lifecycle methods validity **********/
  if (methods.has("created")) {
    throw new Error(deprecatedNotice("created", "constructor"));
  }

  if (methods.has("attached")) {
    throw new Error(deprecatedNotice("attached", "connectedCallback"));
  }

  if (methods.has("detached")) {
    throw new Error(deprecatedNotice("detached", "disconnectedCallback"));
  }

  if (methods.has("attributeChanged")) {
    throw new Error(deprecatedNotice("attributeChanged", "attributeChangedCallback"));
  }

  return { className, parent, properties, methods };
}

/**
 * Parse JavaScript output to fetch default values, decorators, annotations, generated additional variable name and
 * pre-formatted JavaScript src
 *
 * @todo parse default values using goTo function
 * @todo update jsdoc
 *
 * @param src String to parse
 * @param dtsData Data fetched from TypeScript declaration
 * @param options Options passed to parser
 * @param options.definedAnnotations Available design-time annotations
 * @param options.polymerVersion Targeted Polymer version
 * @param options.allowDecorators Whether decorators should be allowed (TODO)
 *
 * @throws Error if no class was found
 *
 * @returns decorators, annotations, generated additional variable name and pre-formatted JavaScript src
 */
export function parseJS(src: string, dtsData: DTSParsedData, options: JSParserOptions = <any> {}): JSParsedData {
  let className, properties, methods;
  ({ className, properties, methods } = dtsData);

  /********** declare result objects **********/
  const decorators = [];
  const annotations = [];

  /********** get class body position **********/
  const { isES6, start: classStart, end: classEnd, generatedName } = findClassBody({ src, className });

  /********** get constructor position **********/
  const { start: constructorStart, end: constructorEnd } = findConstructor({ isES6, className, src, classStart });

  if (constructorStart !== -1) {
    (methods.get("constructor") || {}).body = (<any> src)
      .slice(src.indexOf("(", constructorStart), constructorEnd + 1)
      .replace(...getDefaultValues({ properties }));
  }

  /********** get method bodies **********/
  src = (<any> src)
    .replace(...getMethodBodies({ src, methods, isES6, className }))

  /********** get decorators and remove them if needed **********/
    .replace(...removeExtend({ className }))
    .replace(...getFieldDecorators({ methods, properties, className, options }))
    .replace(...getClassDecorators({ annotations, decorators, className, options, generatedName }));

  return { decorators, annotations, src, generatedName, classBody: [ classStart, classEnd ] };
}
