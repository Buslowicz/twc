/// <reference path="../../types/annotations.d.ts"/>
"use strict";
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
