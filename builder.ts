import { JSDoc, PropertyDeclaration, SyntaxKind } from 'typescript';
import { getDecorators, hasModifier, ParsedDecorator } from './helpers';
import { getTypeAndValue, ValidValue } from './parsers';

export interface PolymerPropertyConfig {
  type: SyntaxKind;
  value?: ValidValue;
  readOnly?: boolean;
  reflectToAttribute?: boolean;
  notify?: boolean;
  computed?: string;
  observer?: string;
}

export interface PropertyObject {
  config: PolymerPropertyConfig | ValidValue;
  jsDoc?: string;
}

export interface ConfigExtras {
  methods: Array<(...args) => any>;
  properties: Array<PolymerProperty>;
}

export class PolymerProperty {
  public name: string;
  public type: Constructor<ValidValue>;
  public value?: ValidValue;
  public readOnly?: boolean;
  public reflectToAttribute?: boolean;
  public notify?: boolean;
  public computed?: string;
  public observer?: string;
  public jsDoc?: Array<JSDoc>;

  constructor(data) {
    Object.assign(this, data);
  }

  public toString() {
    return `${this.getJsDoc()}${this.name}: ${
      this.isSimpleConfig() ? this.type.name : `{ ${
        [
          this.getType(),
          this.getValue(),
          this.getReadOnly(),
          this.getReflectToAttribute(),
          this.getNotify(),
          this.getComputed(),
          this.getObserver()
        ]
          .filter((key) => !!key)
          .join(', ')} }`
      }`;
  }

  private getType() {
    return `type: ${this.type.name}`;
  }

  private getValue() {
    if (this.value) {
      return `value: ${typeof this.value === 'function' ? this.value.toString() : this.value}`;
    }
    return undefined;
  }

  private getReadOnly() {
    return this.readOnly ? 'readOnly: true' : undefined;
  }

  private getReflectToAttribute() {
    return this.reflectToAttribute ? 'reflectToAttribute: true' : undefined;
  }

  private getNotify() {
    return this.notify ? 'notify: true' : undefined;
  }

  private getComputed() {
    return this.computed ? `computed: ${this.computed}` : undefined;
  }

  private getObserver() {
    return this.observer ? `observer: ${this.observer}` : undefined;
  }

  private getJsDoc() {
    return this.jsDoc ? `${this.jsDoc.map((doc) => doc.getText()).join('\n')}\n` : '';
  }

  private isSimpleConfig(): boolean {
    return this.type
      && this.value === undefined
      && !this.readOnly
      && !this.reflectToAttribute
      && !this.notify
      && !this.computed
      && !this.observer;
  }
}

export const typeMap = {
  [SyntaxKind.StringKeyword]: String,
  [SyntaxKind.NumberKeyword]: Number,
  [SyntaxKind.BooleanKeyword]: Boolean,
  [SyntaxKind.ObjectKeyword]: Object,
  [SyntaxKind.ArrayType]: Array
};

const decoratorsMap = {
  attr: (property: PolymerProperty) => property.reflectToAttribute = true,
  compute: (property: PolymerProperty, ref: string | ((...args) => any), args: Array<string>) => {
    if (typeof ref === 'string') {
      property.computed = `"${ref}(${args.join(', ')})"`;
      return { methods: [] };
    } else {
      property.computed = `"${ref.name}(${args.join(', ')})"`;
      return { methods: [ ref ] };
    }
  },
  notify: (property: PolymerProperty) => property.notify = true
};

function decorateProperty(propertyObject: PolymerProperty, decorators: Array<ParsedDecorator>): ConfigExtras {
  const methods = [];
  const properties = [];
  decorators.forEach((decorator) => {
    if (decorator.name in decoratorsMap) {
      const {
        methods: met = [],
        properties: prop = []
      } = decoratorsMap[ decorator.name ](propertyObject, ...(decorator.arguments || []));
      methods.push(...met);
      properties.push(...prop);
    }
  });

  return { methods, properties };
}

export function buildPropertyObject(property: PropertyDeclaration): { config: PolymerProperty, extras: ConfigExtras } {
  const { type, value, isDate } = getTypeAndValue(property);
  const readOnly = hasModifier(property, SyntaxKind.ReadonlyKeyword);
  const decorators = getDecorators(property);

  const config = new PolymerProperty({
    jsDoc: property[ 'jsDoc' ] as Array<JSDoc>,
    name: property.name.getText(),
    type: isDate ? Date : typeMap[ type || SyntaxKind.ObjectKeyword ],
    value,
    readOnly
  });

  const extras = decorateProperty(config, decorators);

  return { config, extras };
}
