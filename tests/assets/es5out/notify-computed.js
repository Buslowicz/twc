"use strict";
var polymer_1 = require("../../annotations/polymer");
var NotifyComputed = (function () {
    function NotifyComputed() {
    }
    NotifyComputed.prototype.test = function (prop) {
        console.log(prop);
        return "test";
    };
    return NotifyComputed;
}());
__decorate([
    polymer_1.notify, polymer_1.computed
], NotifyComputed.prototype, "test", null);
exports.NotifyComputed = NotifyComputed;
