"use strict";
require("./types");
const polymer_1 = require("twc/polymer");
require("bower:polymer/polymer.html");
const esp_html_1 = require("bower:esp/esp.html");
/**
 * A behavior
 */
const myBehavior = {
    test() {
        console.log("behavior test");
    }
};
/**
 * A test class
 *
 * @demo test.html
 */
let ElementName = class ElementName extends Polymer.Element {
    /**
     * A test class
     *
     * @demo test.html
     */
    constructor() {
        super(...arguments);
        this.test = "tester";
    }
    /**
     * Some static method
     */
    static staticTest(test, test2, test3) {
        console.log("static");
    }
    /**
     * Observer method
     */
    observer(val) {
        console.log("val:", val);
    }
    observerAuto(greetings) {
        console.log("greetings:", greetings);
    }
    computedProp(val) {
        console.log(val);
        return val + "!";
    }
    computedPropAuto(test) {
        console.log("test:", test);
        return test + "!";
    }
    externalDependency() {
        return esp_html_1.test;
    }
};
__decorate([
    polymer_1.attr
], ElementName.prototype, "greetings", void 0);
__decorate([
    polymer_1.notify
], ElementName.prototype, "profile", void 0);
__decorate([
    polymer_1.observe("profile.prop")
], ElementName.prototype, "observer", null);
__decorate([
    polymer_1.observe
], ElementName.prototype, "observerAuto", null);
__decorate([
    polymer_1.computed("test")
], ElementName.prototype, "computedProp", null);
__decorate([
    polymer_1.computed
], ElementName.prototype, "computedPropAuto", null);
ElementName = __decorate([
    polymer_1.template("template.element-name.html"),
    polymer_1.style("h1 {color: red;}"),
    polymer_1.style("style.css"),
    polymer_1.style("shared-style"),
    polymer_1.behavior(myBehavior)
], ElementName);
exports.ElementName = ElementName;
