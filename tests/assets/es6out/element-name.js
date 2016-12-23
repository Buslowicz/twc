/// <reference path="../../types/annotations.d.ts"/>
"use strict";
require("link!bower_components/polymer/polymer.html");
require("link!node_modules/easy-polymer/dist/esp.html");
const MyBehavior = {
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
    attr
], ElementName.prototype, "greetings", void 0);
__decorate([
    notify
], ElementName.prototype, "profile", void 0);
__decorate([
    observe("profile.prop")
], ElementName.prototype, "observer", null);
__decorate([
    observe
], ElementName.prototype, "observerAuto", null);
__decorate([
    computed("test")
], ElementName.prototype, "computedProp", null);
__decorate([
    computed
], ElementName.prototype, "computedPropAuto", null);
ElementName = __decorate([
    template("template.element-name.html"),
    style("h1 {color: red;}"),
    style("style.css"),
    style("shared-style"),
    behavior(MyBehavior)
], ElementName);
exports.ElementName = ElementName;
