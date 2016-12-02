"use strict";
const source_crawlers_1 = require("./source-crawlers");
const ts_parsers_1 = require("./ts-parsers");
const js_parsers_1 = require("./js-parsers");
const code_builders_1 = require('./code-builders');
/**
 * Parse TypeScript declaration to fetch class name, super class, properties and methods names, types and modifiers
 *
 * @param src String to parse
 *
 * @throws Error if no class was found
 *
 * @returns Class name, super class, properties and methods names, types and modifiers
 */
function parseDTS(src) {
    let match = src.match(/[\s\n]class ([\w$_]+)(?:[\s]+extends ([^{]+))?[\s]*\{/);
    if (!match) {
        throw new Error("no class found");
    }
    const className = match[1];
    const parent = match[2];
    const properties = new Map();
    const methods = new Map();
    let start = match.index + match[0].length;
    for (let ptr = start, end = src.length, char = src.charAt(ptr); 
    // condition
    ptr < end; 
    // post-actions
    char = src.charAt(++ptr)) {
        let params, match;
        // skip whitespace
        let from = ptr = source_crawlers_1.goTo(src, /\S/, ptr);
        // is it the end of class?
        if (src.charAt(from) === "}") {
            break;
        }
        // find next stop (semicolon for the end of line, colon for end of prop name, parenthesis for end of method name
        ({ index: ptr, found: match } = source_crawlers_1.regExpClosestIndexOf(src, /;|:|\(/, ptr));
        // get name and modifiers
        let { name, modifiers } = ts_parsers_1.getPropertyNoType(src, from, ptr);
        // method
        if (match === "(") {
            // find end of parameters declaration
            let end = source_crawlers_1.findClosing(src, ptr, "()");
            // find the colon to start searching for type
            params = ts_parsers_1.parseParams(src, ptr + 1, end);
            let closing = source_crawlers_1.regExpClosestIndexOf(src, /;|:/, end);
            ptr = closing.index + 1;
            if (closing.found === ";") {
                methods.set(name, code_builders_1.buildField(modifiers, name, params));
                continue;
            }
        }
        else if (match === ";") {
            properties.set(name, code_builders_1.buildField(modifiers, name));
            continue;
        }
        let { type, end: typeEnd } = ts_parsers_1.getType(src, ptr + 1);
        ptr = src.indexOf(";", typeEnd);
        if (params) {
            methods.set(name, code_builders_1.buildField(modifiers, name, params, type));
        }
        else {
            properties.set(name, code_builders_1.buildField(modifiers, name, null, type));
        }
    }
    return { className, parent, properties, methods };
}
exports.parseDTS = parseDTS;
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
 * @param options.polymerVersion Targeted Polymer version
 * @param options.allowDecorators Whether decorators should be allowed (TODO)
 *
 * @throws Error if no class was found
 *
 * @returns default values, decorators, annotations, generated additional variable name and pre-formatted JavaScript src
 */
function parseJS(src, dtsData, options = {}) {
    let className, properties, methods;
    ({ className, properties, methods } = dtsData);
    /********** declare result objects **********/
    const decorators = {};
    const annotations = {};
    /********** get class body position **********/
    const { isES6, start: classStart, end: classEnd, generatedName } = js_parsers_1.findClassBody({ src, className });
    /********** get constructor position **********/
    const { start: constructorStart, end: constructorEnd } = js_parsers_1.findConstructor({ isES6, className, src, classStart });
    /********** get default values **********/
    src
        .slice(constructorStart + 1, constructorEnd)
        .replace(...js_parsers_1.getDefaultValues({ properties }));
    /********** get method bodies **********/
    src = src
        .replace(...js_parsers_1.getMethodBodies({ src, methods, isES6, className }))
        .replace(...js_parsers_1.removeExtend({ className }))
        .replace(...js_parsers_1.getFieldDecorators({ annotations, decorators, className, options }))
        .replace(...js_parsers_1.getClassDecorators({ annotations, decorators, className, options, generatedName }));
    return { decorators, annotations, src, generatedName, classBody: [classStart, classEnd] };
}
exports.parseJS = parseJS;
//# sourceMappingURL=index.js.map