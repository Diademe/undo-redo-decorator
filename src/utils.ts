export const notDefined = Symbol("not defined");

/** overload equality so NaN === NaN */
export function equality(a: any, b: any): boolean {
    return a === b || (Number.isNaN(a) === true && Number.isNaN(b) === true);
}

/** return all properties (including non enumerable one) */
export function getAllPropertyNames<T, K extends keyof T>(obj: T): [K, PropertyDescriptor][] {
    const props: [K, PropertyDescriptor][] = [];
    do {
        Object.getOwnPropertyNames(obj).forEach(prop => {
            const propertyDescriptor = Object.getOwnPropertyDescriptor(
                obj,
                prop
            );
            if (
                propertyDescriptor.writable &&
                props.findIndex(([prop2, _]) => {
                    return prop2 === prop;
                }) === -1
            ) {
                props.push([prop as K, propertyDescriptor]);
            }
        });
    } while ((obj = Object.getPrototypeOf(obj)));
    return props;
}
