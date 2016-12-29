"use strict";
/// <reference path="./types.d.ts"/>
const polymer_1 = require("../../annotations/polymer");
require("script!bower_components/jquery/jquery.js");
require("script!bower_components/mathquill/mathquill.js");
let InputMath = InputMath_1 = class InputMath extends Polymer.Element {
    constructor() {
        super();
        this.value = "";
        this.symbols = [
            InputMath_1.SYMBOLS_BASIC,
            InputMath_1.SYMBOLS_GREEK
        ];
        this.showSymbols = "";
        this.fn = function () { return typeof window; };
        this._observerLocked = false;
        this._freezeHistory = false;
        this._editor = document.createElement("div");
        var editor = this._editor;
        editor.id = "editor";
        editor.classList.add(this.is);
        this["_mathField"] = MathQuill.getInterface(2).MathField(editor, {
            spaceBehavesLikeTab: true,
            handlers: {
                edit: this._updateValue.bind(this)
            }
        });
    }
    ready() {
        this.insertBefore(this._editor, this.$.controls);
    }
    cmd(ev) {
        this._mathField.cmd(ev.model.item.cmd).focus();
    }
    undo() {
        if (this._history && this._history.length > 0) {
            this._freezeHistory = true;
            this.value = this._history.pop();
            this._freezeHistory = false;
        }
    }
    valueChanged(value, prevValue) {
        this._updateHistory(prevValue);
        if (this._observerLocked) {
            return;
        }
        this._mathField.select().write(value);
        if (this._mathField.latex() === "") {
            this.undo();
        }
    }
    symbolsChanged(symbols) {
        if (symbols) {
            this.symbols = symbols.split(",").map(groupName => {
                return InputMath_1["SYMBOLS_" + groupName.toUpperCase()] || [];
            });
        }
    }
    keyShortcuts(ev) {
        if (ev.ctrlKey && ev.keyCode === 90) {
            this.undo();
        }
    }
    _updateValue(test) {
        console.log(test);
        this._observerLocked = true;
        this.value = this._mathField.latex();
        this._observerLocked = false;
    }
    _updateHistory(prevValue) {
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
    }
};
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
