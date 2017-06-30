# Typed Web Components
[![Build Status](https://travis-ci.org/Draccoz/twc.svg?branch=master)](https://travis-ci.org/Draccoz/twc)
[![Coverage Status](https://coveralls.io/repos/github/Draccoz/twc/badge.svg?branch=master)](https://coveralls.io/github/Draccoz/twc?branch=master)

Typed Web Components brings you a boilerplate-less, TypeScript based way, to write native Polymer modules (Polymer toolbox friendly).
The entire process is done in the design time, so no additional dependency needs to be added to the project.

## Installation
```
npm install -g twc
```

## Using
TWC comes with the CLI. Most of its configuration comes from `tsconfig` (and `bower.json`), and it pretty much works the same as tsc.
To transform ts classes into native polymer modules, just enter the project root dir and execute the following in the terminal:

```
twc
```

It works just as `tsc`, reading configuration from `tsconfig.json` file. The only difference is it outputs `.html` files with Polymer
module instead of plain `.js`.

## Configuration
### Including annotations
Annotations will be available at the `@types` npm namespace. Until this happens, types need to be included in tsconfig:
```
{
  "compilerOptions": {
    ...
  },

  "files": [
    ...
  ],
  "include": [
    "node_modules/twc/types/polymer.decoratora.d.ts"
  ]
}
```

### Polymer version
TWC allows to compile the same code into either Polymer 1.x or Polymer 2.x ([WIP](https://github.com/Draccoz/twc/issues/16)).
Before compiling, `bower.json` is checked for Polymer dependency version and then it is used as a target. For example:
```
"polymer": "Polymer/polymer#^1.8.0"
```
will build a Polymer 1.x module, while this one:
```
"polymer": "Polymer/polymer#^2.0.0"
```
builds an ES6 based Polymer 2.x module.

### TypeScript options
TypeScript compiler options are available for twc as well, not everything is supported though. Here is a list of **unsupported** options
(might eventually change in the future):
* sourceMap
* outFile
* jsx
* jsxFactory

## Creating modules
Modules in TWC embrace the syntax and keywords of the TypeScript language, and are simply just classes. Conventions to follow match the
Polymer 2.x (V1 Web Components spec).

```TypeScript
@CustomElement()
export class MyElement extends Polymer.Element {
    name: string;
}
```
equals
```
<dom-module id="my-element">
  <script>
    Polymer({
      is: "my-element",
      properties: {
        name: {
          type: String
        }
      }
    });
  </script>
</dom-module>
```

### Templating
There are 4 ways to add a template (so nobody gets bored):
* Provide a template within `@template` decorator
* Provide a path to template file within `@template` decorator
* Return a template from `template()` method
* Do not use any of the above and create an html file named the same as ts file with the component

The first approach is very common and you probably have seen this multiple times. Everything that would normally go between `<template>`
tags, would now go into the decorator. No fancy magic here.
```TypeScript
@CustomElement()
@template(`<h1>Hello [[name]]</h1>`)
export class MyElement extends Polymer.Element {
    name: string;
}
```

Similarly the second approach, you just need to provide a relative path to the template (just as you would import it via `<link rel="import">`
tag). The content of the template file should be as in the first approach - code between `<template>` tags.
```TypeScript
@CustomElement()
@template('template.html')
export class MyElement extends Polymer.Element {
    name: string;
}
```

If you are coming more from a React world, you might like the `render()` method. So here it is, a `template()` method which works very alike.
The advantage of this method is that you have access to the class prototype, and you can use it in a template string. Every `this` expression
will be replaced with two-way binding to the property (if you have a suggestion how to determine when to use two-way and when to use one-way
binding, please do let me know).
```TypeScript
@CustomElement()
export class MyElement extends Polymer.Element {
    name: string;
    template() {
        return `<h1>Hello ${this.name}</h1>`;
    }
}
```

The final approach is to leave the class as is and create a template file, with the same name as the ts file. On compile time, twc will pick
up the file contents and attach it (just like with second approach). Be careful though! If you don't specify outDir, final modules might
replace the templates (by default, it will generate html file with the same base name).

**Please note** TWC uses Polymer templates. To read more about templates and binding please refer to
[this](https://www.polymer-project.org/2.0/docs/devguide/dom-template) docs.

### Importing scripts and html modules
ES imports do not work in the browsers yet. Instead Polymer uses the HTML Imports. This allows us to use `<link>` tags to import modules,
but how do we do that in TWC?
```
import "./my-component.html";
```
Same principle applies to scripts (converted to `<script>` tags):
```
import "./some-library.js";
```
The above are compiled to
```
<link rel="import" href="./my-component.html">
```
and
```
<script src="./some-library.js"></script>
```
respectively.

#### Imports from bower
Handling relative paths to bower or npm repositories might be painful. This is where aliases come in handy:
```
import "bower:polymer/polymer-element.html";
import "npm:jquery/dist/jquery.min.js";
```

The above will be translated to use the bower directory from `.bowerrc` and will fall back to `bower_components`.
As most of developers will use `polymer-cli` to serve the components, paths to `bower_components` will be translated to as if the project
root were inside that folder.

If for any reason you need to change the npm or bower folder names or paths, you can do that by setting `bowerDir` and `npmDir` environment
variables.

#### Imports relative to project root
It is also possible to import relative to project root. Just add a `~` in front of the path:
```
import "~demo/index.html";
import "~bower_components/polymer/polymer-element.html";
```

#### Importing members of a module
To import members of other modules (for example importing a behavior), use the ES imports:

```
import { IronControlState } from "bower:iron-behaviors/iron-control-state.html";
```

If there is a namespace declared in the definitions, it will automatically upgrade all the instances of imported member.

**Please note** to allow importing from html modules, you need to generate definitions.

#### Generating types for Polymer elements/behaviors
To generate the type declarations from existing behaviors/components, use the [potts](https://github.com/Draccoz/potts) tool.
Simply install it globally (`npm install potts -g`) and run `potts path/to/component.html`. Declarations will be saved under the `types`
directory by default (configurable via `--outDir` or `-d` flag). This will generate declarations for html module and all its dependencies.
All modules will be declared to match the importable path (for example `bower:polymer/polymer.html`).

Further improvement of `potts` tool will generate types of every bower dependency installed via bower.

**For generating types out of internal components/behaviors please allow [this](https://github.com/Draccoz/twc/issues/48) issue to be resolved.**

### Documenting events
Every solid project should have a proper documentation. This also includes documenting events fired by the component. TWC lets you do it
with ease by creating an interface that extends `Event` or `CustomEvent`.
```
/** My custom event, which fires when needed */
export interface SomeEvent extends CustomEvent {
  detail: {
    /** Property inside event.detail */
    myCustomProp: string;
  };
}
```

### Default values for properties
Any value set directly to property declaration will be used as the default value. Any not primitive value (Array, Object, etc) will be
wrapped with a function:
``` TypeScript
export class MyElement {
    title: string = '';
    categories: Array = [];
}
```

will translate to 

``` js
Polymer({
    properties: {
        title: {
            type: string,
            value: ''
        },
        categories: {
            type: Array,
            value: function() {
                return [];
            }
        }
    }
});
```

### Private properties
Not everything should be added to `properties` config. To skip that process, property has to be defined as private:
```TypeScript
export class MyElement {
    name: string; // is added to properties config
    private hasName: boolean; // is NOT added to properties config
}
```

### ReadOnly properties
Not everything in Polymer can be done with TypeScript keywords, but read only property is as easy as prefixing it `readonly`:
```TypeScript
export class MyElement {
    readonly name: string; // property will have `readOnly` flag
}
```

### Behaviors and Mixins
Work in Progress

### Decorators
As mentioned before, not everything can be done with keywords. This is why TWC comes with a set of design-time annotations.

To use them, install twc locally and import in elements' source files as needed:

```TypeScript
import { attr, compute, notify, observe, style, template } from 'twc/polymer';
```

#### @template
To give your component a body, you need to provide it with a template. This is done using `@template` annotation, which accepts either
HTML template code, or a path to html template (has to have `.html` extension).
```TypeScript
@template(`<h1>Hello {{name}}</h1>`)
export class MyElement {
    name: string;
}
```
```TypeScript
@template(`template.html`)
export class MyElement {
    name: string;
}
```

#### @style
Styling the component is as easy as giving it a template. `@style` annotation accepts css code, css file path or shared style name.
Multiple styles can be provided to a single component.
```TypeScript
@template(`<h1>Hello {{name}}</h1>`)
@style(`:host {display: block;}`, `style.css`, `shared-styles`)
export class MyElement {
    name: string;
}
```

#### @attr and @notify
`@attr` and `@notify` add `reflectToAttribute` and `notify` flags to
`properties` config.
```TypeScript
export class MyElement {
    @attr() name: string; // property will have `reflectToAttribute` flag
    @notify() age: number; // property will have `notify` flag
}
```

#### @compute
Computed properties are properties that combine one or more dependencies (watched properties). Whenever any of the dependency changes,
computed property method fires and returned result is assigned to the property.
More info [here](https://www.polymer-project.org/1.0/docs/devguide/observers#computed-properties).
TWC allows to create them in 2 ways: by providing a function name and dependencies array, or by passing a resolver function directly (in that
case dependencies can be passed in an array of strings, or as function arguments).
```TypeScript
export class MyElement {
    name: string;
    age: number;
    cards: Array<string>;

    // Responds to `name` changes. Property name taken from function argument.
    @compute((name: string) => `Hi, I am ${name}`) greetings: string;

    // Responds to `age` changes. Property name taken from an array.
    @compute((value: number) => value >= 18, [ "age" ]) isAdult: boolean;

    // Responds to both `age` and `name` changes.
    @compute((age: number, name: string) => `${name} is ${age} years old`) aboutMe: string;

    // Responds to length of `cards` array changes. As dependency is a path, it has to be added to an array.
    @compute((size) => size, [ "cards.length" ]) collectionSize: number;

    // Responds to name and length of `cards` array changes. Resolver method is provided by name.
    @compute('_summary', [ "name", "cards.length" ]) summary: string;

    private _summary(name, collectionSize) {
        return `${name} has ${collectionSize} cards`;
    }
}
```

#### @observe
You can react to any property or path changes not only by computed properties, but also by observers. Observer does not return anything and
this is the only difference between them.
```TypeScript
export class MyElement {
    name: string;
    cards: Array<string>;

    // Responds to name and length of `cards` array changes.
    @observe("name", "cards.length") summary(name, collectionSize) {
        console.log(`${name} cards collection size changed to ${collectionSize} cards`;
    }
}
```

## More to come!
Typed Web Components is in an early phase and needs your feedback. Please try it out and if you find a problem post it in issues.
Also, do not hesitate to also post ideas!

## Roadmap
* Polymer v2 compile target
* Analysing included files on-the-fly to fetch namespaces and all the necessary details
* Make mixins and behaviors work properly
* Importing events interfaces (to avoid redeclaration
* Make relative imports not break if outDir changes the files structure
* Warn on using reserved property/method name (like `classList`)
* Allow expressions in the templates
* Generate valid source maps

## Running tests on Windows

To run tests on Windows (`npm run test`) it is currently necessary to
modify the `include` section of `tsconfig.json` file so it contains
the pattern below:

``` json
{
  "include": [
    "node_modules/@types/**/*.d.ts"
  ]
}
```
