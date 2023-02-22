export const notDefined = Symbol("not defined");

export const positiveMod = (value: number, mod: number): number => {
    return ((value % mod) + mod) % mod;
};

/** overload equality so NaN === NaN */
export const equality = (a: any, b: any): boolean => {
    return a === b || (Number.isNaN(a) === true && Number.isNaN(b) === true);
};

/** return all properties (including non enumerable one) */
export const getAllPropertyNames = <T, K extends keyof T>(obj: T): IterableIterator<[K, PropertyDescriptor]> => {
    const properties: Map<K, PropertyDescriptor> = new Map();
    do {
        for (const property of Object.getOwnPropertyNames(obj)) {
            const propertyDescriptor = Object.getOwnPropertyDescriptor(
                obj,
                property
            );
            if (
                propertyDescriptor.writable &&
                !properties.has(property as K)
            ) {
                properties.set(property as K, propertyDescriptor);
            }
        }
    } while ((obj = Object.getPrototypeOf(obj)));
    return properties.entries();
};

/**
 * @param array on which to perform find
 * @param predicate
 * @param from starting index
 * @returns last index where predicate is true, 0
 */
export const reverseFindIndex = <T>(
    array: T[],
    predicate: (elt: T, index: number, history: T[]) => boolean,
    from?: number
): number => {
    from = from ?? array.length - 1;
    for (let index = from; index >= 0; index--) {
        if (predicate(array[index], index, array)) {
            return index;
        }
    }
    return 0;
};
