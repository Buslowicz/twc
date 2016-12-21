declare function template(tpl: string): (target: Function) => void;
declare function style(tpl: string): (target: Function) => void;
declare function attr(proto: any, key: string): void;
declare function notify(proto: any, key: string): void;
declare function computed(props: string): (proto: any, key: string) => void;
declare function computed(proto: any, key: string): void;
declare function observe(props: string): (proto: any, key: string) => void;
declare function observe(proto: any, key: string): void;
