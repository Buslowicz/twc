# TS classes to native Polymer compiler
 
**Work in progress**

To run it:
1. clone this repo `git clone git@github.com:Draccoz/ts2html.git`
2. install dependencies `npm install`, you can also run `npm test` to check if everything is fine
3. link module to npm `npm link`
4. create sample project with below code (feel free to tweak it and experiment):
5. create `dist` folder in sample project root (needed just for now)
6. run `pcc` in sample project root

**Please be aware that this is an alpha version (or rather PoC) and is far from being finished. So far it does not support multiple entry files and still has some issues.
Feel free to post issues and ideas here as it might help me with development.** 

## Sample project
tsconfig.json
```JSON
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "module": "commonjs",
        "target": "es6",
        "noImplicitAny": false,
        "sourceMap": false
    },
    "include": [
        "src/element-name.ts",
        "node_modules/@dracco/ts-component-compiler/types/annotations.d.ts"
    ]
}
```

src/element-name.ts
```TypeScript
@template(`<h1>tester: [[test]]</h1>`)
export class ElementName {
  @attr greetings: Array<string>;
  readonly test: string = "tester";
  @notify profile: any;

  @observe("profile.prop") observer(val: string) {
    console.log("val:", val);
  }

  @observe observerAuto(greetings: Array<string>) {
    console.log("greetings:", greetings);
  }

  @computed("test") computedProp(val: string) {
    console.log(val);
    return val + "!";
  }

  @computed computedPropAuto(test: string) {
    console.log("test:", test);
    return test + "!";
  }
}
```
