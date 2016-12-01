/**
 * Works just like indexOf, but skips all kinds of brackets and strings
 *
 * @param src String to search
 * @param term Search term
 * @param offset (Optional) Search offset
 *
 * @returns Index of found character or -1 if not found
 */
export declare function goTo(src: string, term: string | RegExp, offset?: number): number;
/**
 * Splits the string by given term, skips all kinds of brackets and strings
 *
 * @param src String to split
 * @param term Search term (split by this)
 * @param trim (Optional) Should chunks be trimmed
 *
 * @returns List of strings split by searched term
 */
export declare function split(src: string, term: string | RegExp, trim?: boolean): string[];
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
export declare function findClosing(src: string, offset: number, brackets: string): number;
/**
 * Finds first character that matches the search criteria and returns the found character and index
 *
 * @param src String to search
 * @param term Search term
 * @param offset (Optional) Search offset
 *
 * @returns Found character and index or -1 and null, if nothing was found
 */
export declare function regExpClosestIndexOf(src: string, term: RegExp, offset?: number): FoundMatch;
