// source https://stackoverflow.com/questions/40922531/how-to-check-if-a-javascript-function-is-a-constructor
export function is_constructor(f: any) {
    try {
        Reflect.construct(String, [], f);
    }
    catch (e) {
        return false;
    }
    return true;
}

export function getAllPropertyNames<T>(obj: T) {
    const props: [string, PropertyDescriptor][] = [];
    do {
        Object.getOwnPropertyNames(obj).forEach(prop => {
            const propertyDescriptor = Object.getOwnPropertyDescriptor(
                obj,
                prop
            );
            if (
                propertyDescriptor.writable &&
                props.findIndex(([prop2, _]) => { return prop2 === prop; }) === -1
            ) {
                props.push([prop, propertyDescriptor]);
            }
        });
    } while ((obj = Object.getPrototypeOf(obj)));
    return props;
}

export function getInheritedPropertyDescriptor<T extends Object, K extends keyof T>(object: T, propKey: K) {
    let descriptor;
    let obj = object;
    do {
        descriptor = Object.getOwnPropertyDescriptor(obj, propKey);
        obj = Object.getPrototypeOf(obj);
    } while (descriptor === undefined && obj !== null);
    return descriptor;
}

// decorator to set a member as non enumerable
export function notEnumerable(target: any, propertyKey: string) {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {
        writable: true
    };
    Object.defineProperty(target, propertyKey, {
        ...descriptor,
        enumerable: false
    });
}