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
            const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, prop)
            if (propertyDescriptor.writable &&
                props.findIndex(([prop2, _]) => prop2 === prop) === -1) {
                props.push([prop, propertyDescriptor]);
            }
        });
    } while (obj = Object.getPrototypeOf(obj));
    return props;
}
