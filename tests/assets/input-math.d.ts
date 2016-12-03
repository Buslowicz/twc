interface ICmd {
    cmd: string;
    name: string;
    className?: string;
}
interface PolymerEvent extends Event {
    model: any;
}
declare function test1(a: any, b: any): void;
declare function test2(conf: any): any;
declare function template(str: any): (target: any) => void;
declare class InputMath extends polymer.Base {
    static HISTORY_SIZE: number;
    static SYMBOLS_BASIC: ICmd[];
    static SYMBOLS_GREEK: ICmd[];
    static SYMBOLS_PHYSICS: ICmd[];
    testValue: "yep" | "nope";
    value: string | null;
    symbols: ICmd[][];
    showSymbols: string;
    fn: Function;
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
