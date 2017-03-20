"use strict";
var polymer_1 = require("twc/polymer");
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
}(Polymer.Element));
__decorate([
    polymer_1.notify, polymer_1.computed
], NotifyComputed.prototype, "test", null);
exports.NotifyComputed = NotifyComputed;
