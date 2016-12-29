/**
 * Works just like indexOf, but skips all kinds of brackets and strings
 *
 * @param src String to search
 * @param term Search term
 * @param offset (Optional) Search offset
 *
 * @returns Index of found character or -1 if not found
 */
export function goTo(src: string, term: string|RegExp, offset: number = 0): number {
  let char;
  let prevChar = null;
  let checkRegExp = typeof term !== "string";
  let stringOpen = false;

  function openString(chr, prev) {
    if (prev === "\\") {
      return;
    }
    if (stringOpen === chr) {
      stringOpen = false;
    }
    else if (stringOpen === false) {
      stringOpen = chr;
    }
  }

  while ((char = src.charAt(offset))) {
    if (!stringOpen && (checkRegExp && (<RegExp>term).test(char) || char === term)) {
      return offset;
    }
    switch (char) {
      case "{":
        offset = findClosing(src, offset, "{}");
        break;
      case "[":
        offset = findClosing(src, offset, "[]");
        break;
      case "<":
        offset = findClosing(src, offset, "<>");
        break;
      case "(":
        offset = findClosing(src, offset, "()");
        break;
      case "'":
        openString(char, prevChar);
        break;
      case "`":
        openString(char, prevChar);
        break;
      case `"`:
        openString(char, prevChar);
        break;
    }
    prevChar = char;
    offset++;
  }
  return -1;
}

/**
 * Splits the string by given term, skips all kinds of brackets and strings
 *
 * @param src String to split
 * @param term Search term (split by this)
 * @param trim (Optional) Should chunks be trimmed
 *
 * @returns List of strings split by searched term
 */
export function split(src: string, term: string|RegExp, trim: boolean = false): string[] {
  let start = 0;
  let chunks = [];
  do {
    let comma = goTo(src, term, start);
    let chunk = comma === -1 ? src.substr(start) : src.slice(start, comma);
    chunks.push(trim ? chunk.trim() : chunk);
    start = comma + 1;
  }
  while (start > 0);
  return chunks;
}

/**
 * Find index of matching closing bracket
 *
 * @param src String to search
 * @param offset Search offset
 * @param brackets Brackets pair to match (i.e. {}, [], (), <>)
 *
 * @throws SyntaxError - Bracket has no closing
 *
 * @returns Index of found bracket
 */
export function findClosing(src: string, offset: number, brackets: string): number {
  let start = offset;
  let opened = 1;
  let char;
  while ((char = src.charAt(++offset))) {
    switch (char) {
      case brackets[ 0 ]:
        opened++;
        break;
      case brackets[ 1 ]:
        opened--;
        if (opened <= 0) {
          return offset;
        }
        break;
    }
  }
  let line = 1;
  for (let i = 0, l = start; i < l; i++) {
    if (/\n/.test(src.charAt(i))) {
      line++;
    }
  }
  throw new SyntaxError(`Parenthesis has no closing at line ${line}.`);
}

/**
 * Finds first character that matches the search criteria and returns the found character and index
 *
 * @param src String to search
 * @param term Search term
 * @param offset (Optional) Search offset
 *
 * @returns Found character and index or -1 and null, if nothing was found
 */
export function regExpClosestIndexOf(src: string, term: RegExp, offset: number = 0): FoundMatch {
  let char;
  while ((char = src.charAt(offset))) {
    let match = char.match(term);
    if (!match) {
      offset++;
      continue;
    }
    return { index: offset, found: match[ 0 ] };
  }
  return { index: -1, found: null };
}
