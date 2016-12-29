export function template(tpl: string): (target: Function) => void;
export function style(style: string): (target: Function) => void;
export function behavior(behavior: any): (target: Function) => void;
export function attr(proto: any, key: string): void;
export function notify(proto: any, key: string): void;
export function computed(props: string): (proto: any, key: string) => void;
export function computed(proto: any, key: string): void;
export function observe(props: string): (proto: any, key: string) => void;
export function observe(proto: any, key: string): void;
