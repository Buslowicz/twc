# Typed Web Components
[![Build Status](https://travis-ci.org/Draccoz/twc.svg?branch=master)](https://travis-ci.org/Draccoz/twc)

Typed Web Component brings you a boilerplate-less, TypeScript based way,
to write native Polymer modules (Polymer toolbox friendly). The entire
process is done in the design time, so no additional library needs to be
added in the project.

## Installation
```
npm install -g twc
```

## Using
TWC comes with CLI and Stream consuming function (compatible with Gulp).
For single components building, preferred method is to call `twc` command:

```
twc my-element.ts --out-dir dist
```

This will analyze the `my-element.ts` file and output `my-element.d.ts`
and `my-element.html` files in the `dist` folder.

If you want to use a full Polymer toolbox together with TWC, just follow
[custom-build](https://github.com/PolymerElements/generator-polymer-init-custom-build)
instructions to get a glance on Polymer Custom Build structure. Once you
get something similar, import `twc` in your `project.js` gulp task and
wrap `project.sources()` and `project.dependencies()` with imported function:

```JavaScript
const twc = require('twc');
/* ... */
function splitSource() {
  return twc(project.sources()).pipe(project.splitHtml());
}

function splitDependencies() {
  return twc(project.dependencies()).pipe(project.splitHtml());
}
```

Done!

## Configuration
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
builds a ES6 based Polymer 2.x module.

### EcmaScript version and TypeScript options
Sometimes you might want to pick a target EcmaScript version. This can be
done in `tsconfig.json` file ([here](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
is more info on `tsconfig`). There is one restriction: Polymer 2.x will
**NOT** compile to ES5 (it is based on ES classes).
You can also change other TypeScript CompilerOptions. The only flags that
cannot be changed are:
```
declaration: true,
experimentalDecorators: true,
module: "commonjs",
noEmit: false
```

Default config can be found [here](src/config.json).

## Creating modules
Modules in TWC embrace the syntax and keywords of the TypeScript, and
are simply classes. Conventions to follow match closely Polymer 2.x ones.

```TypeScript
export class MyElement {
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
ES imports do not work in the browsers yet, but Polymer brings the HTML
Imports polyfill. This allows us to use `<link>` tags to import modules,
but how do we do it in TWC? Using imports with `link!` prefix:
```
import "link!../bower_components/polymer/polymer.html";
```
Same principle applies to scripts (converted to `<script>` tags):
```
import "script!../bower_components/jquery/jquery.js";
```
The above are compiled to
```
<link rel="import" href="../bower_components/polymer/polymer.html">
```
and
```
<script src="../bower_components/jquery/jquery.js"></script>
```
respectively.

### Default values for properties
Any value set directly to property declaration will be used as the default value. Any not primitive value (Array, Object, etc) will be converted to a value function
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

### Annotations
As mentioned before, not everything can be done with keywords. This is why
TWC comes with a set of design-time annotations.

To use them, install twc locally and import in elements' source files as
required:

```TypeScript
import { attr, behavior,  computed, notify, observe, style, template } from 'twc/annotations/polymer';
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

#### @behavior
To add behaviors to your component, use `@behavior` annotation:
```TypeScript
@template(`<h1>Hello {{name}}</h1>`)
@behavior(Polymer.IronButtonState)
export class MyElement {
    name: string;
}
```
**Note:** Behaviors are subject to change due to lack of typings.

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
