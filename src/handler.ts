import { __initialization__, History } from "./core";
import { getInheritedPropertyDescriptor } from "./utils";

const deleted = {};

export function proxyHandler<T extends Object, K extends keyof T>(proxyInternal: any, isClass: boolean) {
    return {
        get(target: T, propKey: K, receiver: any) {
            const historyMap = proxyInternal.history;
            const historyTarget: History<T[K]> = historyMap.get(propKey);
            let result: T[K];
            const descriptor = getInheritedPropertyDescriptor(target, propKey) || {};
            // we should not save setter getter otherwise the logic inside them will be bypassed
            if (descriptor.set || descriptor.get || descriptor.writable === false) {
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
                case "__originalConstructor__":
                    do {
                        result = Reflect.get(target, propKey, receiver);
                    } while ((result as any).__originalConstructor__);
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
                            // if historyTarget is undefined, the property doesn't exist on the target
                            result = historyTarget ? historyTarget.get() : undefined;
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
                return Reflect.set(target, propKey, value, receiver);
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
        has(target: T, propKey: K) {
            if (!proxyInternal.inited) {
                return Reflect.has(target, propKey);
            }
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
        },
        ownKeys(_: T) {
            let res = Reflect.ownKeys(proxyInternal.target)
            if (isClass) {
                const parentOwnKey = Array.from(Reflect.ownKeys(Object.getPrototypeOf(proxyInternal.target)));
                res = res.concat(parentOwnKey.filter((elt) => { return res.indexOf(elt) === -1; }));
            }
            return res;
        },
        getOwnPropertyDescriptor(target: T, propKey: K) {
            const res = Reflect.getOwnPropertyDescriptor(proxyInternal.target, propKey)
            if (res === undefined && isClass) {
                return Reflect.getOwnPropertyDescriptor(Object.getPrototypeOf(proxyInternal.target), propKey);
            }
            return res;
        },
        construct(target: T, argsArray: any, newTarget: any) {
            if (isClass) {
                const initMember: Function = (target as any).__proxyInternal__.constructor.initialization;
                if (initMember !== undefined) {
                    const obj = Reflect.construct(target as any, [false], newTarget); // TODO decide what to give in parameters for constructor and init
                    initMember.call(obj, ...argsArray);
                    return obj;
                }
                else {
                    return Reflect.construct(target as any, argsArray, newTarget);
                }
            }
            else {
                throw new Error(`TypeError: ${target} is not a constructor`)
            }
        }
    } as ProxyHandler<T>;
}

