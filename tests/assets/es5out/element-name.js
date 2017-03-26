"use strict";
require("./types");
var polymer_1 = require("twc/polymer");
var esp_html_1 = require("bower:esp/esp.html");
/**
 * A behavior
 */
var myBehavior = {
    test: function () {
        console.log("behavior test");
    }
};
/**
 * A test class
 *
 * @demo test.html
 */
var ElementName = (function (_super) {
    __extends(ElementName, _super);
    function ElementName() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.test = "tester";
        return _this;
    }
    /**
     * Some static method
     */
    ElementName.staticTest = function (test, test2, test3) {
        console.log("static");
    };
    /**
     * Observer method
     */
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
    ElementName.prototype.externalDependency = function () {
        return esp_html_1.test;
    };
    return ElementName;
}(Polymer.Element));
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
