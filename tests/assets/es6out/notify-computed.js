"use strict";
const polymer_1 = require("../../annotations/polymer");
class NotifyComputed extends polymer_1.default.Element {
    test(prop) {
        console.log(prop);
        return "test";
    }
}
__decorate([
    polymer_1.notify, polymer_1.computed
], NotifyComputed.prototype, "test", null);
exports.NotifyComputed = NotifyComputed;
