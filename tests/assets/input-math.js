/// <reference path="types.d.ts"/>
"use strict";
function test(a, b) {
    console.log(a, b, this);
}
function test2(conf) {
    return test.bind(conf);
}
let InputMath_1 = class InputMath extends polymer.Base {
    constructor() {
        super(...arguments);
        this.value = "";
        this.fn = () => typeof window;
        this._observerLocked = false;
        this._freezeHistory = false;
    }
    created() {
        let editor = this._editor = document.createElement("div");
        editor.id = "editor";
        editor.classList.add(this.is);
        this._mathField = MathQuill.getInterface(2).MathField(editor, {
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
let InputMath = InputMath_1;
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
    property({ type: String, value: "", reflectToAttribute: true }),
    test
], InputMath.prototype, "value", void 0);
__decorate([
    property({
        type: Array, value: () => [
            InputMath_1.SYMBOLS_BASIC,
            InputMath_1.SYMBOLS_GREEK
        ]
    }),
    test2(5)
], InputMath.prototype, "symbols", void 0);
__decorate([
    property({ type: String, value: "" })
], InputMath.prototype, "showSymbols", void 0);
__decorate([
    observe("value")
], InputMath.prototype, "valueChanged", null);
__decorate([
    observe("showSymbols")
], InputMath.prototype, "symbolsChanged", null);
__decorate([
    listen("keydown")
], InputMath.prototype, "keyShortcuts", null);
InputMath = InputMath_1 = __decorate([
    component("input-math")
], InputMath);
InputMath.register();
