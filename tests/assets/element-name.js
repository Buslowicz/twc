"use strict";
require("link!bower_components/polymer/polymer.html");
require("link!node_modules/easy-polymer/dist/esp.html");
class ElementName {
    constructor() {
        this.test = "tester";
    }
    tester(val) {
        console.log("val:", val);
    }
}
exports.ElementName = ElementName;
//# sourceMappingURL=element-name.js.map