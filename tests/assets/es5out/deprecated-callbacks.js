"use strict";
require("twc/polymer");
var DeprecatedCallbacks = (function (_super) {
    __extends(DeprecatedCallbacks, _super);
    function DeprecatedCallbacks() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DeprecatedCallbacks.prototype.created = function () { };
    DeprecatedCallbacks.prototype.attached = function () { };
    DeprecatedCallbacks.prototype.detached = function () { };
    DeprecatedCallbacks.prototype.attributeChanged = function () { };
    return DeprecatedCallbacks;
}(Polymer.Element));
exports.DeprecatedCallbacks = DeprecatedCallbacks;
