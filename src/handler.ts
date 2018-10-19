import { UndoRedo } from "./core";

export function proxyHandler<T extends Object, K extends keyof T>(proxy: T) {
    return {
        get(target: T, propKey: K, receiver: any) {
            let result: T[K];
            switch (propKey) {
                case undefined:
                    throw TypeError(propKey.toString() + " is undefined");
                case "constructor":
                    result = Reflect.get(target, propKey, receiver);
                    break;
                case Symbol.toPrimitive:
                default:
                    const isFunction =
                        Reflect.get(target, propKey) instanceof Function;
                    if (isFunction) {
                        result = Reflect.get(target, propKey).bind(target);
                    }
                    else {
                        result = Reflect.get(target, propKey) as T[K];
                    }
                    break;
            }
            console.log(
                "GET: " +
                    target.constructor.name +
                    "[" +
                    propKey.toString() +
                    "] = " +
                    result
            );
            return result;
        },
        getPrototypeOf() {
            return proxy;
        },
        set(target: T, propKey: K, value: any, receiver: any) {
            const origValue = Reflect.get(target, propKey, receiver) as T[K];
            const res = Reflect.set(target, propKey, value, receiver);
            console.log(
                "SET: " +
                    target.constructor.name +
                    "[" +
                    propKey.toString() +
                    "] = " +
                    value +
                    "(" +
                    origValue +
                    ")"
            );
            return res;
        },
        apply(target: T, thisArg: any, argArray?: any) {
            Reflect.apply(target as any, thisArg, argArray);
            console.log(
                "APPLY:" + target.constructor.name,
                "(" + (argArray ? argArray.toString() : "[]") + ")"
            );
        }
    } as ProxyHandler<T>;
}
