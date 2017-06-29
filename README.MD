# Typed Web Components
[![Build Status](https://travis-ci.org/Draccoz/twc.svg?branch=master)](https://travis-ci.org/Draccoz/twc)
[![Coverage Status](https://coveralls.io/repos/github/Draccoz/twc/badge.svg?branch=master)](https://coveralls.io/github/Draccoz/twc?branch=master)

Typed Web Component brings you a boilerplate-less, TypeScript based way,
to write native Polymer modules (Polymer toolbox friendly). The entire
process is done in the design time, so no additional library needs to be
added to the project.

## Installation
```
npm install -g twc
```

## Using
TWC comes with its CLI (gulp pipe was temporarily removed). Most of its
configuration comes from `tsconfig` (and `bower.json`), and it pretty
much works the same as tsc. To generate ts files into polymer modules,
just enter the project dir and execute in the terminal:

```
twc
```

This works pretty much the same as `tsc`, reading configuration from
`tsconfig.json` file. The only difference is it outputs `.html` files
with Polymer module instead of plain `.js`.

## Configuration
### Including annotations
Annotations will be available at the `@types` npm namespace. Until this
happens, types need to be included in tsconfig:
```
{
  "compilerOptions": {
    ...
  },

  "files": [
    ...
  ],
  "include": [
    "node_modules/twc/types/polymer.annotations.d.ts"
  ]
}
```

### Polymer version
TWC allows to compile the same code into either Polymer 1.x or Polymer 2.x
([WIP](https://github.com/Draccoz/twc/issues/16)). Decision on which one
to pick is based on `bower.json` Polymer dependency version, i.e. having
following dependency:
```
"polymer": "Polymer/polymer#^1.6.0"
```
will build a Polymer 1.x module, while this one:
```
"polymer": "Polymer/polymer#2.0-preview"
```
builds an ES6 based Polymer 2.x module.

### EcmaScript version and TypeScript options
Sometimes you might want to pick a target EcmaScript version. This can be
done in `tsconfig.json` file ([here](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
is more info on `tsconfig`). There is one restriction: Polymer 2.x will
**NOT** compile to ES5 (it is based on ES classes).
You can also change other TypeScript CompilerOptions. The only flags that
are fixed are:
```
experimentalDecorators: true,
module: "commonjs",
noEmit: false
```

## Creating modules
Modules in TWC embrace the syntax and keywords of the TypeScript, and
are simply classes. Conventions to follow match closely Polymer 2.x ones.

```TypeScript
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

### Importing scripts and html modules
ES imports do not work in the browsers yet. Instead Polymer uses the HTML
Imports. This allows us to use `<link>` tags to import modules, but how
do we do it in TWC?
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
To not worry about placement of `bower_components`, linking modules from
this folder can use absolute path:
```
import "bower:polymer/polymer.html";
import "bower:jquery/jquery.min.js";
```

The above will be translated to use the bower directory from `.bowerrc`
and will fall back to `bower_components`.

Different paths for prod/dev will [soon be possible](https://github.com/Draccoz/twc/issues/75).

#### Importing members of a module
Sometimes (or maybe even quite often) you might want to import types
from the module (for example importing a behavior). It is almost identical
to how it is done in TypeScript itself:

```
import { IronControlState } from "bower:iron-behaviors/iron-control-state.html#Polymer";
```

In the above example, we are importing `IronControlState` from the global
namespace `Polymer`, declared in `iron-control-state.html`. If there was
no namespace (the `IronControlState` would be accessible from `window`
object), the `#Polymer` can be skipped.

#### Generating types for Polymer elements/behaviors
To generate the type declarations from ready behaviors/components, use
the [potts](https://github.com/Draccoz/potts) tool. Simply install it
globally (`npm install potts -g`) and run `potts path/to/component.html`.
Declarations will be saved under `types` directory by default (configurable
via `--outDir` or `-d` flag). This will generate declarations for html
module and all its dependencies. All modules will be declared to match the
importable path (for example `bower:polymer/polymer.html`) and a separate
module for each declared global namespace (like `bower:polymer/polymer.html#Polymer`
or `bower:iron-behaviors/iron-control-state.html#Polymer`).

Further improvement of `potts` tool will generate types of every bower
dependency which is a polymer component.

**For generating types out of internal components/behaviors please allow
[this](https://github.com/Draccoz/twc/issues/48) issue to be resolved.**

### Documenting events
Every solid project should have a proper documentation. This also includes
documenting events fired by the component. TWC lets you do it with ease
by creating an interface that extends `Event` or `CustomEvent`.
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
Any value set directly to property declaration will be used as the default
value. Any not primitive value (Array, Object, etc) will be converted to
a value function
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
Not everything should be added to `properties` config. To skip that process,
property has to be defined as private:
```TypeScript
export class MyElement {
    name: string; // is added to properties config
    private hasName: boolean; // is NOT added to properties config
}
```

### ReadOnly properties
Not everything in Polymer can be done with TypeScript keywords, but read
only property is as easy as prefixing it `readonly`:
```TypeScript
export class MyElement {
    readonly name: string; // property will have `readOnly` flag
}
```

### Behaviors
Behaviors are a bit tricky. Annotations will work for generating valid
output, but it will not add types. This is why instead of `@behavior`
annotation, a trick is needed:
```
export interface MyComponent extends IronControlState {}

@template("<h1>Hello {{name}}</h1>")
export class MyComponent extends Polymer.Element {
    ...
}
```
The above creates both interface and component with the same name. This
allows to extend definitions, which are later used in the component
itself. Furthermore, the above syntax will allow TWC to add the behavior
to the component declaration. **The ES Mixins syntax
[will soon be supported](https://github.com/Draccoz/twc/issues/12) as well.**

### Annotations
As mentioned before, not everything can be done with keywords. This is why
TWC comes with a set of design-time annotations.

To use them, install twc locally and import in elements' source files as
required:

```TypeScript
import { attr, behavior,  computed, notify, observe, style, template } from 'twc/polymer';
```

#### @template
To give your component a body, you need to provide it with a template.
This is done using `@template` annotation, which accepts either HTML template
code, or a path to html template (has to have `.html` extension).
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
Styling the component is as easy as giving it a template. `@style` annotation
accepts css code, css file path or shared style name. Multiple styles can
be provided to a single component.
```TypeScript
@template(`<h1>Hello {{name}}</h1>`)
@style(`:host {display: block;}`)
@style(`style.css`)
@style(`shared-styles`)
export class MyElement {
    name: string;
}
```

#### @attr and @notify
`@attr` and `@notify` add `reflectToAttribute` and `notify` flags to
`properties` config.
```TypeScript
export class MyElement {
    @attr name: string; // property will have `reflectToAttribute` flag
    @notify age: number; // property will have `notify` flag
}
```

#### @computed and @observe
Computed properties and observer methods work almost the same way in Polymer.
More about them can be found [here](https://www.polymer-project.org/1.0/docs/devguide/observers#computed-properties).
They can be created using `@computed` and `@observe` annotation. Each of
them have two interfaces: with and without arguments.
```TypeScript
export class MyElement {
    name: string;
    age: number;
    cards: Array<string>;
    // responds to `name` changes
    @computed greetings(name: string): string {
        return `Hi, I am ${name}`;
    }

    // responds to `age` changes
    @computed("age") isAdult(value: number): string {
        return value >= 18;
    }

    // responds to both `age` and `name` changes
    @computed("age, name") aboutMe(age: number, name: string): string {
        return `${name} is ${age} years old`;
    }

    // responds to length of `cardsCollection` changes
    @computed("cards.length") collectionSize(size: number): number {
        return size;
    }
}
```

## More to come!
Typed Web Components is in an early phase and needs your feedback. Please
try it out and if you find an issue post it in issues tab. Also, do not
hesitate to also post ideas!

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
