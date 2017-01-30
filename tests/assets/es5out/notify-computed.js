"use strict";
var polymer_1 = require("../../annotations/polymer");
var NotifyComputed = (function (_super) {
    __extends(NotifyComputed, _super);
    function NotifyComputed() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NotifyComputed.prototype.test = function (prop) {
        console.log(prop);
        return "test";
    };
    return NotifyComputed;
}(polymer_1.default.Element));
__decorate([
    polymer_1.notify, polymer_1.computed
], NotifyComputed.prototype, "test", null);
exports.NotifyComputed = NotifyComputed;
