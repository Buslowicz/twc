"use strict";
const polymer_1 = require("../../annotations/polymer");
require("link!bower_components/polymer/polymer.html");
require("link!node_modules/easy-polymer/dist/esp.html");
const myBehavior = {
    test() {
        console.log("behavior test");
    }
};
let ElementName = class ElementName {
    constructor() {
        this.test = "tester";
    }
    static staticTest() {
        console.log("static");
    }
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
