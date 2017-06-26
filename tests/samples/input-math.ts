import { attr, notify, observe, template } from "twc/polymer";

import "./imports/jquery.js";
import "./imports/mathquill.js";

export interface ICmd {
  cmd: string;
  name: string;
  className?: string;
}

export interface PolymerEvent extends Event {
  model: any;
}

@component("input-math")
@template("<input>")
export class InputMath extends Polymer.Element {
  public static HISTORY_SIZE: number = 20;

  public static SYMBOLS_BASIC: ICmd[] = [
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

  public testValue: "yep"|"nope";

  @attr() public value: string|null = "";

  @notify() public symbols: ICmd[][] = [
    InputMath.SYMBOLS_BASIC
  ];

  public showSymbols: string = "";

  private history: string[];
  private mathField: MathQuill.EditableField;
  private observerLocked: boolean = false;
  private freezeHistory: boolean = false;
  private editor: HTMLElement = document.createElement("div");

  constructor() {
    super();
    const editor: HTMLElement = this.editor;
    editor.id = "editor";
    editor.classList.add("input-math");
    this[ "_mathField" ] = MathQuill.getInterface(2).MathField(editor, {
      spaceBehavesLikeTab: true,
      handlers: {
        edit: this._updateValue.bind(this)
      }
    });
  }

  public ready(): void {
    this.insertBefore(this.editor, this.$.controls);
  }

  public cmd(ev: PolymerEvent): void {
    this.mathField.cmd(ev.model.item.cmd).focus();
  }

  public undo(): void {
    if (this.history && this.history.length > 0) {
      this.freezeHistory = true;
      this.value = this.history.pop();
      this.freezeHistory = false;
    }
  }

  @observe("value")
  public valueChanged(value: string, prevValue: string) {
    this._updateHistory(prevValue);

    if (this.observerLocked) {
      return;
    }

    this.mathField.select().write(value);
    if (this.mathField.latex() === "") {
      this.undo();
    }
  }

  @observe("showSymbols")
  public symbolsChanged(symbols: string): void {
    if (symbols) {
      this.symbols = symbols.split(",").map((groupName) => {
        return InputMath[ "SYMBOLS_" + groupName.toUpperCase() ] || [];
      });
    }
  }

  @listen("keydown")
  public keyShortcuts(ev: KeyboardEvent): void {
    if (ev.ctrlKey && ev.keyCode === 90) {
      this.undo();
    }
  }

  public _updateValue(test: { a: () => void, b: any }): void {
    console.log(test);
    this.observerLocked = true;
    this.value = this.mathField.latex();
    this.observerLocked = false;
  }

  private _updateHistory(prevValue: string): void {
    if (!this.history) {
      this.history = [];
    }

    if (this.freezeHistory || prevValue == null) {
      return;
    }

    this.history.push(prevValue);
    if (this.history.length > InputMath.HISTORY_SIZE) {
      this.history.shift();
    }
  }
}
