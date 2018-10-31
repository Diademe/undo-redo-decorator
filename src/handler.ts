import { __initialization__, History } from "./core";
import { getInheritedPropertyDescriptor } from "./utils";

const deleted = {};

export function proxyHandler<T extends Object, K extends keyof T>(proxyInternal: any) {
    return {
        get(target: T, propKey: K, receiver: any) {
            const historyMap = proxyInternal.history;
            const historyTarget: History<T[K]> = historyMap.get(propKey);
            let result: T[K];
            const descriptor = getInheritedPropertyDescriptor(target, propKey) || {};
            // we should not save setter getter otherwise the logic inside them will be bypassed
            if (descriptor.set || descriptor.writable === false) {
                return Reflect.get(target, propKey, receiver);
            }
            switch (propKey) {
                case undefined:
                    throw TypeError(propKey.toString() + " is undefined");
                case Symbol.iterator:
                    result = target && typeof (target as any)[Symbol.iterator] === "function" ?
                        (target as any)[Symbol.iterator].bind(target) :
                        undefined;
                    break;
                case "constructor":
                case "__proxyInternal__":
                    result = Reflect.get(target, propKey, receiver);
                    break;
                default:
                    if (!proxyInternal.inited) {
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
            if (!proxyInternal.inited) {
                return Reflect.set(target, propKey, value);
            }
            // we should not save setter getter otherwise the logic inside them will be bypassed
            if ((getInheritedPropertyDescriptor(target, propKey) || {}).set) {
                return Reflect.set(target, propKey, value, receiver);
            }
            if (value && (value as any).__proxyInternal__) {
                __initialization__(value, proxyInternal.master);
            }

            let result: boolean;
            switch (propKey) {
                case undefined:
                    throw TypeError(propKey.toString() + " is undefined");
                case "constructor":
                case "__proxyInternal__":
                    result = Reflect.set(target, propKey, value);
                    break;
                default:
                    result = true;
                    break
            }
            const history: Map<K, History<T[K]>> = proxyInternal.history;
            if (!history.has(propKey)) {
                history.set(propKey,
                    new History<any>(
                        proxyInternal.master,
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
        },
        has(target: T, propKey: K) {
            const history: Map<K, History<T[K]>> = proxyInternal.history;
            if (history.has(propKey)) {
                try {
                    const val = history.get(propKey).get();
                    if (val === deleted) {
                        return false;
                    }
                    return true;
                }
                catch {
                    return false;
                }
            }
            return false;
        },
        deleteProperty(target: T, propKey: K) {
            const history: Map<K, History<T[K]>> = proxyInternal.history;
            if (history.has(propKey)) {
                history.get(propKey).set(deleted as any);
            }
            return Reflect.deleteProperty(target, propKey)
        }
    } as ProxyHandler<T>;
}

