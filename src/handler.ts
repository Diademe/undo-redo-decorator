export function proxyHandler<T extends object, K extends keyof T>(obj: T) {
    return {
        get: function (target: T, propKey: K, receiver: any) {
            let result: T[K];
            switch (propKey) {
                case undefined:
                    throw TypeError(propKey.toString() + " is undefined");
                case "constructor":
                    result = Reflect.get(target, propKey, receiver);
                    break;
                case Symbol.toPrimitive:
                default:
                    const isFunction = Reflect.get(target, propKey) instanceof Function;
                    if (isFunction)
                        result = Reflect.get(target, propKey).bind(target);
                    else
                        result = Reflect.get(target, propKey) as T[K];
                    break;
            }
            console.log("GET: " + target.constructor.name + "[" + propKey.toString() + "] = " + result)
            return result;
        },
        getPrototypeOf: function () { return obj; },
        set: function (target: T, propKey: K, value: any, receiver: any) {
            var origValue = target[propKey] as T[K];
            target[propKey] = value;
            console.log("SET: " + target.constructor.name + "[" + propKey.toString() + "] = " + value + "(" + origValue + ")")
            return true;
        },
        apply: function (target: T, thisArg: any, argArray?: any) {
            Reflect.apply(target as Function, thisArg, argArray);
            console.log("APPLY:" + target.constructor.name , "(" + (argArray? argArray.toString() : "[]")  + ")");
        }
    } as ProxyHandler<T>;
}