import "./types";
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
export declare class InputMath extends Polymer.Element {
    static HISTORY_SIZE: number;
    static SYMBOLS_BASIC: ICmd[];
    static SYMBOLS_GREEK: ICmd[];
    static SYMBOLS_PHYSICS: ICmd[];
    testValue: "yep" | "nope";
    value: string | null;
    symbols: ICmd[][];
    showSymbols: string;
    private _history;
    private _mathField;
    private _observerLocked;
    private _freezeHistory;
    private _editor;
    constructor();
    ready(): void;
    cmd(ev: PolymerEvent): void;
    undo(): void;
    valueChanged(value: string, prevValue: string): Array<{
        test: boolean;
    }>;
    symbolsChanged(symbols: string): void;
    keyShortcuts(ev: KeyboardEvent): void;
    _updateValue(test: {
        a: () => void;
        b: any;
    }): void;
    private _updateHistory(prevValue);
}
