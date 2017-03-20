"use strict";
require("./types");
var polymer_1 = require("twc/polymer");
require("imports/jquery.js");
require("imports/mathquill.js");
var InputMath = InputMath_1 = (function (_super) {
    __extends(InputMath, _super);
    function InputMath() {
        var _this = _super.call(this) || this;
        _this.value = "";
        _this.symbols = [
            InputMath_1.SYMBOLS_BASIC,
            InputMath_1.SYMBOLS_GREEK
        ];
        _this.showSymbols = "";
        _this._observerLocked = false;
        _this._freezeHistory = false;
        _this._editor = document.createElement("div");
        var editor = _this._editor;
        editor.id = "editor";
        editor.classList.add("input-math");
        _this["_mathField"] = MathQuill.getInterface(2).MathField(editor, {
            spaceBehavesLikeTab: true,
            handlers: {
                edit: _this._updateValue.bind(_this)
            }
        });
        return _this;
    }
    InputMath.prototype.ready = function () {
        this.insertBefore(this._editor, this.$.controls);
    };
    InputMath.prototype.cmd = function (ev) {
        this._mathField.cmd(ev.model.item.cmd).focus();
    };
    InputMath.prototype.undo = function () {
        if (this._history && this._history.length > 0) {
            this._freezeHistory = true;
            this.value = this._history.pop();
            this._freezeHistory = false;
        }
    };
    InputMath.prototype.valueChanged = function (value, prevValue) {
        this._updateHistory(prevValue);
        if (this._observerLocked) {
            return;
        }
        this._mathField.select().write(value);
        if (this._mathField.latex() === "") {
            this.undo();
        }
    };
    InputMath.prototype.symbolsChanged = function (symbols) {
        if (symbols) {
            this.symbols = symbols.split(",").map(function (groupName) {
                return InputMath_1["SYMBOLS_" + groupName.toUpperCase()] || [];
            });
        }
    };
    InputMath.prototype.keyShortcuts = function (ev) {
        if (ev.ctrlKey && ev.keyCode === 90) {
            this.undo();
        }
    };
    InputMath.prototype._updateValue = function (test) {
        console.log(test);
        this._observerLocked = true;
        this.value = this._mathField.latex();
        this._observerLocked = false;
    };
    InputMath.prototype._updateHistory = function (prevValue) {
        if (!this._history) {
            this._history = [];
        }
        if (this._freezeHistory || prevValue == null) {
            return;
        }
        this._history.push(prevValue);
        if (this._history.length > InputMath_1.HISTORY_SIZE) {
            this._history.shift();
        }
    };
    return InputMath;
}(Polymer.Element));
InputMath.HISTORY_SIZE = 20;
InputMath.SYMBOLS_BASIC = [
    { cmd: "\\sqrt", name: "√" },
    { cmd: "\\nthroot", name: "√", className: "n-sup" },
    { cmd: "\\int", name: "∫" },
    { cmd: "^", name: "n", className: "sup" },
    { cmd: "_", name: "n", className: "sub" },
    { cmd: "\\rightarrow", name: "→" },
    { cmd: "\\infty", name: "∞" },
    { cmd: "\\neq", name: "≠" },
    { cmd: "\\degree", name: "°" },
    { cmd: "\\div", name: "÷" }
];
InputMath.SYMBOLS_GREEK = [
    { cmd: "\\lambda", name: "λ" },
    { cmd: "\\pi", name: "π" },
    { cmd: "\\mu", name: "μ" },
    { cmd: "\\sum", name: "Σ" },
    { cmd: "\\alpha", name: "α" },
    { cmd: "\\beta", name: "β" },
    { cmd: "\\gamma", name: "γ" },
    { cmd: "\\delta", name: "ᵟ", className: "big" },
    { cmd: "\\Delta", name: "Δ" }
];
InputMath.SYMBOLS_PHYSICS = [
    { cmd: "\\ohm", name: "Ω" },
    { cmd: "\\phi", name: "ᶲ", className: "big" }
];
__decorate([
    polymer_1.attr
], InputMath.prototype, "value", void 0);
__decorate([
    polymer_1.notify
], InputMath.prototype, "symbols", void 0);
__decorate([
    polymer_1.observe("value")
], InputMath.prototype, "valueChanged", null);
__decorate([
    polymer_1.observe("showSymbols")
], InputMath.prototype, "symbolsChanged", null);
__decorate([
    listen("keydown")
], InputMath.prototype, "keyShortcuts", null);
InputMath = InputMath_1 = __decorate([
    component("input-math"),
    polymer_1.template("<input>")
], InputMath);
exports.InputMath = InputMath;
var InputMath_1;
