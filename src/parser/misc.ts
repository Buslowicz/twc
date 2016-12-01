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

/**
 * @todo docs
 */
export function nonEmpty(consts, param) {
  if (param.length) {
    return "";
  }
  return consts[ 0 ] + param + consts[ 1 ];
}
