import { upperFirst, camelCase } from "lodash";

export function template({ params }: AnnotationOptions) {
  let template = params.slice(1, -1);
  let type;
  if (template.endsWith(".html")) {
    type = "link";
  }
  else {
    type = "inline";
  }
  return { template, type };
}

export function style({ params, styles }: AnnotationOptions) {
  let style = params.slice(1, -1).trim();
  let type;
  if (style.endsWith(".css")) {
    type = "link";
  }
  else if (/^[\w\d]+(-[\w\d]+)+$/.test(style)) {
    type = "shared";
  }
  else {
    type = "inline";
  }
  styles.push({ style, type });
}

export function behavior({ params, behaviors }: AnnotationOptions) {
  behaviors.push(params);
}

export function attr({ prop, config, propertiesMap }: AnnotationOptions) {
  if (prop) {
    prop.reflectToAttribute = true;
  }
  else {
    let field = propertiesMap.get(config.name);
    if (!field) {
      field = <any> {};
      propertiesMap.set(config.name, field);
    }
    field.reflectToAttribute = true;
  }
}

export function notify({ prop, config, propertiesMap }: AnnotationOptions) {
  if (prop) {
    prop.notify = true;
  }
  else {
    let field = propertiesMap.get(config.name);
    if (!field) {
      field = <any> {};
      propertiesMap.set(config.name, field);
    }
    field.notify = true;
  }
}

export function observe({ config, propertiesMap, observers, params }: AnnotationOptions) {
  let observedProps;

  if (params) {
    observedProps = params.replace(/["'`](.*)["'`]/, "$1").split(",");
  }
  else {
    observedProps = config.params.map(param => param.name);
  }

  const isPropertyDeclared = propertiesMap.has(observedProps[ 0 ]);

  if (isPropertyDeclared && observedProps.length === 1 && observedProps[ 0 ].includes(".") === false) {
    propertiesMap.get(observedProps[ 0 ]).observer = `"${config.name}"`;
  }
  else {
    observers.push(`"${config.name}(${observedProps.join(", ")})"`);
  }
}

export function computed({ config, propertiesMap, method, params }: AnnotationOptions) {
  let observedProps;
  if (params) {
    observedProps = params.replace(/["'`](.*)["'`]/, "$1").split(",");
  }
  else {
    observedProps = config.params.map(param => param.name);
  }
  let name = config.name;
  method.name = `_compute${upperFirst(camelCase(name))}`;
  let field = propertiesMap.get(name);
  let computed = { type: config.type, computed: `"${method.name}(${observedProps.join(", ")})"` };
  if (field) {
    Object.assign(field, computed);
  } else {
    propertiesMap.set(name, computed);
  }
}
