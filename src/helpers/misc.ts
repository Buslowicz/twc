/**
 * Convert array to object, using given value (default `true`) as value
 *
 * @param arr Array of strings to convert
 * @param value Value to assign to keys
 *
 * @returns An object with array values as keys and given value as object values
 */
export function arrToObject(arr: Array<string>, value: any = true): any {
  let obj = {};
  for (let i = 0, l = arr.length; i < l; i++) {
    obj[ arr[ i ] ] = value;
  }
  return obj;
}

export function get(obj, path, fallback) {
  let chunks = path.split(".");
  for (let i = 0, l = chunks.length; i < l; i++) {
    obj = obj[chunks[i]];
    if (!obj) {
      return fallback;
    }
  }
  return obj;
}

/**
 * Template string tag to return empty string if param is an empty array
 *
 * @param stringsArray List of template string constants
 * @param param List of params passed to template string
 *
 * @returns Built template string or empty string if params list is empty
 */
export function nonEmpty(stringsArray: TemplateStringsArray, param: Array<string>|string): string {
  if (!param || param.length === 0) {
    return null;
  }
  return stringsArray[ 0 ] + param + stringsArray[ 1 ];
}

export function stripJSDoc(doc) {
  return doc
    .slice(3, -2)
    .trim()
    .split("\n")
    .map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith("*")) {
          return trimmedLine.substr(1).trim();
        }
        else {
          return trimmedLine;
        }
      }
    )
    .join("\n");
}

export function wrapJSDoc(doc) {
  return ["/**"]
    .concat(doc
      .split("\n")
      .map(line => line.length > 0 ? ` * ${line}` : " *")
    )
    .concat(" */")
    .join("\n");
}

export function findDocComment(str, i): string | undefined {
  let commentStart = -1, commentEnd;
  while (--i >= 0) {
    if (/\s/.test(str[ i ])) {
      continue;
    }
    if (str[ i ] === "/" && str[ i - 1 ] === "*") {
      commentEnd = i--;
      break;
    }
    return undefined;
  }
  while (--i >= 0) {
    if (str[ i - 2 ] === "/" && str[ i - 1 ] === "*" && str[ i ] === "*") {
      commentStart = i - 2;
      break;
    }
  }
  return str.slice(commentStart, commentEnd + 1);
}
