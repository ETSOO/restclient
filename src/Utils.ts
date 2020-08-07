/**
 * String dictionary type
 */
export type StringDictionary = Record<string, string>;

/**
 * Simple type
 */
export type SimpleType =
    | bigint
    | boolean
    | Date
    | null
    | number
    | string
    | symbol
    | undefined;

/**
 * Is the target a simple type (Type guard)
 * @param target Test target
 */
export function isSimpleType(target: any): target is SimpleType {
    return target instanceof Date || target !== Object(target);
}

/**
 * Simple object
 */
export type SimpleObject = Record<string, SimpleType>;

/**
 * Is the target a simple object (Type guard)
 * @param data Test target
 */
export function isSimpleObject(target: any): target is SimpleObject {
    return (
        target &&
        target.constructor === Object &&
        Object.values(target).findIndex((item) => !isSimpleType(item)) === -1
    );
}

/**
 * Merge URL search parameters
 * @param base Base URL search parameters
 * @param data New simple object data
 */
export function mergeURLSearchParams(
    base: URLSearchParams,
    data: SimpleObject
) {
    Object.entries(data).forEach(([key, value]) => {
        if (value == null) return;
        base.set(key, value.toString());
    });
    return base;
}

/**
 * Polyfill Object.fromEntries
 * @param entries Entries
 */
export function fromEntries(
    entries: IterableIterator<[string, string]> | string[][]
) {
    const init: Record<string, string> = {};
    return [...entries].reduce((obj, [key, val]) => {
        // eslint-disable-next-line no-param-reassign
        obj[key] = val;
        return obj;
    }, init);
}

/**
 * Convert headers to object
 * @param headers Heaers
 */
export function headersToObject(headers: HeadersInit) {
    if (headers instanceof Headers) {
        return fromEntries(headers.entries());
    }

    if (Array.isArray(headers)) {
        return fromEntries(headers);
    }

    return headers;
}

/**
 * Is JSON content type
 * @param contentType Content type string
 */
export function isJSONContentType(contentType: string) {
    if (
        contentType &&
        // application/problem+json
        // application/json
        (contentType.includes('json') ||
            contentType.startsWith('application/javascript'))
    )
        return true;
    return false;
}
