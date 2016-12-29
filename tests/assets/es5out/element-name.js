"use strict";
var polymer_1 = require("../../annotations/polymer");
require("link!bower_components/polymer/polymer.html");
require("link!node_modules/easy-polymer/dist/esp.html");
var MyBehavior = {
    test: function () {
        console.log("behavior test");
    }
};
var ElementName = (function () {
    function ElementName() {
        this.test = "tester";
    }
    ElementName.staticTest = function () {
        console.log("static");
    };
    ElementName.prototype.observer = function (val) {
        console.log("val:", val);
    };
    ElementName.prototype.observerAuto = function (greetings) {
        console.log("greetings:", greetings);
    };
    ElementName.prototype.computedProp = function (val) {
        console.log(val);
        return val + "!";
    };
    ElementName.prototype.computedPropAuto = function (test) {
        console.log("test:", test);
        return test + "!";
    };
    return ElementName;
}());
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
    polymer_1.behavior(MyBehavior)
], ElementName);
exports.ElementName = ElementName;
