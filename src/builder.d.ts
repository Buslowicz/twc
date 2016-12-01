/// <reference types="node" />
import { Stream } from "stream";
export declare function init({globalConfig, projectConfig, dist, src}: {
    globalConfig?: any;
    projectConfig?: any;
    dist?: string;
    src: any;
}): void;
export declare function clean(): Promise<string[]>;
export declare function lint(): Promise<{}>;
export declare function buildHTML(): Promise<{}>;
export declare function build(): void;
export declare function parse([dtsSrc, jsSrc]: Array<File & {
    contents: Buffer;
}>): DTSParsedData & JSParsedData;
export declare function streamToPromise(stream: Stream): Promise<File & {
    contents: Buffer;
}>;
export declare function buildConfig(): {
    dts: Promise<File & {
        contents: Buffer;
    }>;
    js: Promise<File & {
        contents: Buffer;
    }>;
    config: Promise<DTSParsedData & JSParsedData>;
};
