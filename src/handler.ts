import { __initialization__, History } from "./core";

export function proxyHandler<T extends Object, K extends keyof T>() {
    return {
        get(target: T, propKey: K, receiver: any) {
            const historyMap = (target as any).__history__;
            const historyTarget: History<T[K]> = historyMap.get(propKey);
            let result: T[K];
            switch (propKey) {
                case undefined:
                    throw TypeError(propKey.toString() + " is undefined");
                case Symbol.iterator:
                    result = (target as any)[Symbol.iterator].bind(target);
                    break;
                case "constructor":
                case "__proxy__":
                case "__inited__":
                case "__master__":
                case "__history__":
                case "__originalConstructor__":
                    result = Reflect.get(target, propKey, receiver);
                    break;
                default:
                    if (!(target as any).__inited__) {
                        result = Reflect.get(target, propKey);
                        return typeof result === "function" ? result.bind(target) : result;
                    }
                    const memberValue = Reflect.get(target, propKey);
                    switch (typeof memberValue) {
                        case "undefined":
                            result = undefined;
                            break;
                        case "function":
                            switch (propKey) {
                                case "has":
                                case "values":
                                case "entries":
                                    result = memberValue.bind(target);
                                    break;
                                default:
                                    result = memberValue.bind(receiver);
                                    break;
                            }
                            break;
                        default:
                            result = historyTarget.get() as T[K];
                            break;
                    }
            }
            return result;
        },
        getPrototypeOf(target: T) {
            return target;
        },
        set(target: T, propKey: K, value: any, receiver: any) {
            if (!(target as any).__inited__) {
                return Reflect.set(target, propKey, value);
            }
            let result: boolean;
            switch (propKey) {
                case undefined:
                    throw TypeError(propKey.toString() + " is undefined");
                case "constructor":
                case "__proxy__":
                case "__inited__":
                case "__master__":
                case "__history__":
                case "__originalConstructor__":
                    result = Reflect.set(target, propKey, value);
                    break;
                default:
                    result = true;
                    break
            }
            const history: Map<K, History<T[K]>> = (target as any).__history__;
            if (!history.has(propKey)) {
                history.set(propKey,
                    new History<any>(
                    (target as any).__master__,
                    value
                ));
            }
            else {
                history.get(propKey).set(value);
            }
            Reflect.set(target, propKey, value); // keep object up to date to allow iteration over it
            return result;
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
