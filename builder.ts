import { JSDoc, PropertyDeclaration, SyntaxKind } from 'typescript';
import { hasDecorator, hasModifier } from './helpers';
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

export class PolymerProperty {
  constructor(private name: string,
              private type: Constructor<ValidValue>,
              private value?: ValidValue,
              private readOnly?: boolean,
              private reflectToAttribute?: boolean,
              private notify?: boolean,
              // private computed?: string,
              // private observer?: string,
              private jsDoc?: Array<JSDoc>) {}

  public toString() {
    return `${this.getJsDoc()}${this.name}: ${
      this.isSimpleConfig() ? this.type.name : `{ ${
        [
          this.getType(),
          this.getValue(),
          this.getReadOnly(),
          this.getReflectToAttribute(),
          this.getNotify()
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

  // private getComputed() {
  //   return this.computed;
  // }
  // private getObserver() {
  //   return this.observer;
  // }

  private getJsDoc() {
    return this.jsDoc ? `${this.jsDoc.map((doc) => doc.getText()).join('\n')}\n` : '';
  }

  private isSimpleConfig(): boolean {
    return this.type && this.value === undefined && !this.readOnly && !this.reflectToAttribute && !this.notify;
  }
}

export const typeMap = {
  [SyntaxKind.StringKeyword]: String,
  [SyntaxKind.NumberKeyword]: Number,
  [SyntaxKind.BooleanKeyword]: Boolean,
  [SyntaxKind.ObjectKeyword]: Object,
  [SyntaxKind.ArrayType]: Array
};

export function buildPropertyObject(property: PropertyDeclaration): PolymerProperty {
  const { type, value, isDate } = getTypeAndValue(property);
  const readOnly = hasModifier(property, SyntaxKind.ReadonlyKeyword);
  const reflectToAttribute = hasDecorator(property, 'attr');
  const notify = hasDecorator(property, 'notify');

  return new PolymerProperty(
    property.name.getText(),
    isDate ? Date : typeMap[ type || SyntaxKind.ObjectKeyword ],
    value,
    readOnly,
    reflectToAttribute,
    notify,
    property[ 'jsDoc' ] as Array<JSDoc>
  );
}
