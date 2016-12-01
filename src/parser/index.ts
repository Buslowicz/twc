import { goTo, findClosing, regExpClosestIndexOf } from "./source-crawlers";
import { getPropertyNoType, getType, parseParams } from "./ts-parsers";
import {
  fieldDecoratorsAnalyzer, classDecoratorsAnalyzer, methodsAnalyzer,
  defaultValueAnalyzer, removeExtend, findClassBody, findConstructor
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

  const properties = [];
  const methods = [];

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
        methods.push(buildField(modifiers, name, params));
        continue;
      }
    }
    // no type property
    else if (match === ";") {
      properties.push(buildField(modifiers, name));
      continue;
    }

    let { type, end: typeEnd } = getType(src, ptr + 1);
    ptr = src.indexOf(";", typeEnd);

    if (params) {
      methods.push(buildField(modifiers, name, params, type));
    }
    else {
      properties.push(buildField(modifiers, name, null, type));
    }
  }

  return { className, parent, properties, methods };
}

/**
 * Parse JavaScript output to fetch default values, decorators, annotations, generated additional variable name and
 * pre-formatted JavaScript src
 *
 * @todo consider removing default values as an option
 * @todo parse default values using goTo function
 *
 * @param src String to parse
 * @param dtsData Data fetched from TypeScript declaration
 * @param options Options passed to parser
 * @param options.definedAnnotations Available design-time annotations
 *
 * @throws Error if no class was found
 *
 * @returns default values, decorators, annotations, generated additional variable name and pre-formatted JavaScript src
 */
export function parseJS(src: string, dtsData: DTSParsedData, options: JSParserOptions = <any> {}): JSParsedData {
  const { definedAnnotations = [], polymerVersion = 1 } = options;
  const { className, properties, methods } = dtsData;

  /********** declare result objects **********/
  const values = {};
  const methodBodies = {};
  const decorators = {};
  const annotations = {};

  /********** get class body position **********/
  const { isES6, start: classStart, end: classEnd, generatedName } = findClassBody({ src, className });

  /********** get constructor position **********/
  const { start: constructorStart, end: constructorEnd } = findConstructor({ isES6, className, src, classStart });

  /********** get default values **********/
  (<any> src)
    .slice(constructorStart + 1, constructorEnd)
    .replace(...defaultValueAnalyzer({ values, properties }));

  /********** get method bodies **********/
  (<any> src)
    .replace(...removeExtend({ className }))
    .replace(...methodsAnalyzer({ src, methodBodies, methods, isES6, className }));

  /********** get decorators and remove them if needed **********/
  let decorStart = src.indexOf("__decorate([", constructorEnd);
  let decorSrc = (<any> src
    .substr(decorStart))
    .replace(...fieldDecoratorsAnalyzer({ annotations, decorators, definedAnnotations, className }))
    .replace(...classDecoratorsAnalyzer({ generatedName, annotations, decorators, definedAnnotations, className }));

  dtsData.properties.forEach(prop => {
    let val = values[ prop.name ];
    if (val) {
      prop.defaultValue = val;
    }
  });

  dtsData.methods.forEach(prop => {
    let body = methodBodies[ prop.name ];
    if (body) {
      prop.body = body;
    }
  });

  let polymerSrc;

  if (polymerVersion === 1) {
    polymerSrc = buildPolymerV1(dtsData);
  }
  else {
    polymerSrc = buildPolymerV1(dtsData);
  }

  let finalSrc = [
    src.slice(0, classStart),
    polymerSrc,
    src.slice(classEnd + 1, decorStart),
    decorSrc
  ].join("");

  return { values, methodBodies, decorators, annotations, generatedName, src: finalSrc };
}
