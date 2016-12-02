"use strict";
const source_crawlers_1 = require('./source-crawlers');
/**
 * Return pattern and replacer function to find field level decorators
 *
 * @param decorators List of run-time decorators
 * @param annotations List of design-time annotations
 * @param className Name of the class
 * @param options JSParser options
 *
 * @returns RegExp pattern and replacer function
 */
function getFieldDecorators({ decorators, annotations, className, options }) {
    return [
        new RegExp(`[\\s]*__decorate\\(\\[([\\W\\w]*?)], (${className}\\.prototype), "(.*?)", (.*?)\\);`, "g"),
            (_, definition, proto, name, descriptor) => {
            let usedDecorators = [];
            let usedAnnotations = [];
            definition = definition.trim();
            // get each decorator name and execution params
            for (let decors = source_crawlers_1.split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
                let decor = decors[i];
                let ptr = decor.indexOf("(");
                let [name, params = undefined] = ptr !== -1 ? [
                    decor.slice(0, ptr),
                    decor.slice(ptr + 1, decor.length - 1)
                ] : [decor];
                if (options.definedAnnotations.indexOf(name) !== -1) {
                    usedAnnotations.push({ name, params, descriptor, src: decor });
                }
                else {
                    usedDecorators.push({ name, params, descriptor, src: decor });
                }
            }
            decorators[name] = usedDecorators;
            annotations[name] = usedAnnotations;
            if (!options.allowDecorators || usedDecorators.length === 0) {
                return "";
            }
            return `\n__decorate([${usedDecorators.map(n => n.src).toString()}], ${proto}, "${name}", ${descriptor});`;
        }
    ];
}
exports.getFieldDecorators = getFieldDecorators;
/**
 * Return pattern and replacer function to find class level decorators
 *
 * @param decorators List of run-time decorators
 * @param annotations List of design-time annotations
 * @param className Name of the class
 * @param generatedName Generated helper name
 * @param options JSParser options
 *
 * @returns RegExp pattern and replacer function
 */
function getClassDecorators({ decorators, annotations, className, generatedName, options }) {
    return [
        new RegExp(`[\\s]*${className} = (?:.*? = )?__decorate\\(\\[([\\W\\w]*?)], (${className})\\);`, "g"),
            (_, definition) => {
            let usedDecorators = [];
            let usedAnnotations = [];
            definition = definition.trim();
            // get each decorator name and execution params
            for (let decors = source_crawlers_1.split(definition, ",", true), i = 0, l = decors.length; i < l; i++) {
                let decor = decors[i];
                let ptr = decor.indexOf("(");
                let [name, params = undefined] = ptr !== -1 ? [
                    decor.slice(0, ptr),
                    decor.slice(ptr + 1, decor.length - 1)
                ] : [decor];
                if (options.definedAnnotations.indexOf(name) !== -1) {
                    usedAnnotations.push({ name, params, src: decor });
                }
                else {
                    usedDecorators.push({ name, params, src: decor });
                }
            }
            decorators["class"] = usedDecorators;
            annotations["class"] = usedAnnotations;
            if (!options.allowDecorators || usedDecorators.length === 0) {
                return "";
            }
            if (generatedName) {
                generatedName += " = ";
            }
            else {
                generatedName = "";
            }
            return `\n${className} = ${generatedName}__decorate([${usedDecorators.map(n => n.src)
                .toString()}], ${className});`;
        }
    ];
}
exports.getClassDecorators = getClassDecorators;
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
function getMethodBodies({ src, methods, isES6, className }) {
    if (methods.size === 0) {
        return [/^$/, ""];
    }
    let methodsList = Array.from(methods.values()).map(itm => itm.name).join("|");
    return [
        isES6
            ? new RegExp(`((${methodsList}))\\(.*?\\) {`, "g")
            : new RegExp(`(${className}.prototype.(${methodsList}) = function ?)\\(.*?\\) {`, "g"),
            (_, boiler, name, index) => {
            let end = source_crawlers_1.findClosing(src, src.indexOf("{", index + boiler.length), "{}");
            methods.get(name).body = src.slice(index + boiler.length, end + 1).trim();
            return _;
        }
    ];
}
exports.getMethodBodies = getMethodBodies;
/**
 * Return pattern and replacer function to find default values
 *
 * @param properties List of properties config
 *
 * @returns RegExp pattern and replacer function
 */
function getDefaultValues({ properties }) {
    if (properties.size === 0) {
        return [/^$/, ""];
    }
    return [
        new RegExp(`this\\.(${Array.from(properties.values()).map(itm => itm.name).join("|")}) = (.*);\\n`, "g"),
            (_, name, value) => properties.get(name).defaultValue = value
    ];
}
exports.getDefaultValues = getDefaultValues;
/**
 * Remove __extend helper from ES5
 *
 * @param className Name of the class
 *
 * @returns RegExp pattern and replacer function
 */
function removeExtend({ className }) {
    return [
        new RegExp(`__extends(${className}, _super);`),
        ""
    ];
}
exports.removeExtend = removeExtend;
/**
 * Find class source start index, end index, generated helper name and flag if source is ES6 (class based)
 *
 * @param src String to search
 * @param className Name of the class to find
 *
 * @returns Position of class in source and info is this ES6 class and generated helper name
 */
function findClassBody({ src, className }) {
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
    end = source_crawlers_1.findClosing(src, start + line.length, "{}");
    if (!isES6) {
        end = source_crawlers_1.findClosing(src, src.indexOf("(", end), "()");
    }
    end = src.indexOf(";", end);
    return { isES6, start, end, generatedName };
}
exports.findClassBody = findClassBody;
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
function findConstructor({ src, className, isES6, classStart }) {
    let constructorPattern = isES6 ? `constructor(` : `function ${className}(`;
    let start = src.indexOf(constructorPattern, classStart);
    let end = source_crawlers_1.findClosing(src, start + constructorPattern.length - 1, "()");
    end = src.indexOf("{", end);
    end = source_crawlers_1.findClosing(src, end, "{}");
    return { start, end };
}
exports.findConstructor = findConstructor;
//# sourceMappingURL=js-parsers.js.map