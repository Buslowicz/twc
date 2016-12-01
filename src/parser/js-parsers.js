"use strict";
const source_crawlers_1 = require('./source-crawlers');
/**
 * Get field decorators
 * @todo docs
 */
function fieldDecoratorsAnalyzer({ definedAnnotations, decorators, annotations, className }) {
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
                if (definedAnnotations.indexOf(name) !== -1) {
                    usedAnnotations.push({ name, params, descriptor, src: decor });
                }
                else {
                    usedDecorators.push({ name, params, descriptor, src: decor });
                }
            }
            decorators[name] = usedDecorators;
            annotations[name] = usedAnnotations;
            if (usedDecorators.length === 0) {
                return "";
            }
            return `\n__decorate([${usedDecorators.map(n => n.src).toString()}], ${proto}, "${name}", ${descriptor});`;
        }
    ];
}
exports.fieldDecoratorsAnalyzer = fieldDecoratorsAnalyzer;
/**
 * Get class decorators
 * @todo docs
 */
function classDecoratorsAnalyzer({ definedAnnotations, decorators, annotations, className, generatedName }) {
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
                if (definedAnnotations.indexOf(name) !== -1) {
                    usedAnnotations.push({ name, params, src: decor });
                }
                else {
                    usedDecorators.push({ name, params, src: decor });
                }
            }
            decorators["class"] = usedDecorators;
            annotations["class"] = usedAnnotations;
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
                .toString()}], ${className});`;
        }
    ];
}
exports.classDecoratorsAnalyzer = classDecoratorsAnalyzer;
/**
 * Get method bodies
 * @todo docs
 */
function methodsAnalyzer({ src, methodBodies, methods, isES6, className }) {
    let methodsList = methods.map(itm => itm.name).join("|");
    return [
        isES6
            ? new RegExp(`((${methodsList}))\\(.*?\\) {`, "g")
            : new RegExp(`(${className}.prototype.(${methodsList}) = function ?)\\(.*?\\) {`, "g"),
            (_, boiler, name, index) => {
            let end = source_crawlers_1.findClosing(src, src.indexOf("{", index + boiler.length), "{}");
            methodBodies[name] = src.slice(index + boiler.length, end + 1).trim();
            return _;
        }
    ];
}
exports.methodsAnalyzer = methodsAnalyzer;
/**
 * Get default values
 * @todo docs
 */
function defaultValueAnalyzer({ properties, values }) {
    return [
        new RegExp(`this\\.(${properties.map(itm => itm.name).join("|")}) = (.*);\\n`, "g"),
            (_, name, value) => values[name] = value
    ];
}
exports.defaultValueAnalyzer = defaultValueAnalyzer;
/**
 * Remove __extend helper from ES5
 * @todo docs
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
 * @todo docs
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
 * Find constructor position
 * @todo docs
 */
function findConstructor({ isES6, className, src, classStart }) {
    let constructorPattern = isES6 ? `constructor(` : `function ${className}(`;
    let start = src.indexOf(constructorPattern, classStart);
    let end = source_crawlers_1.findClosing(src, start + constructorPattern.length - 1, "()");
    end = src.indexOf("{", end);
    end = source_crawlers_1.findClosing(src, end, "{}");
    return { start, end };
}
exports.findConstructor = findConstructor;
//# sourceMappingURL=js-parsers.js.map