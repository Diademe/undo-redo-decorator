import { __initialization__, History } from "./core";
import { getInheritedPropertyDescriptor } from "./utils";

const deleted = {};

const optimization = new Set(["concat", "reverse", "shift", "sort", "splice", "unshift"]);

export function proxyHandler<T extends Object, K extends keyof T>(isClass: boolean) {
    return {
        get(target: T, propKey: K, receiver: any) {
            if (!(target as any).__proxyInternal__.inited || (target as any).__proxyInternal__.disabled) {
                return Reflect.get(target, propKey, receiver);
            }
            // member decorated with @UndoDoNotTrack should be ignored
            const set = (target as any).__proxyInternal__.constructor.doNotTrack;
            if (set.has(propKey)) {
                return Reflect.get(target, propKey, receiver);
            }
            const descriptor = getInheritedPropertyDescriptor(target, propKey) || {};
            // we should not save setter getter otherwise the logic inside them will be bypassed
            if (descriptor.set || descriptor.get || descriptor.writable === false) {
                return Reflect.get(target, propKey, receiver);
            }
            const historyMap = (target as any).__proxyInternal__.history;
            const historyTarget: History<T[K]> = historyMap.get(propKey);
            let result: T[K];
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
                    if ([Map, WeakMap, Set, WeakSet].find((es6Collection) => target instanceof es6Collection)) {
                        throw new Error(`${target.constructor.name} is an instance of an ES6 collection which is incompatible with Undo Redo Proxy`);
                    }
                    switch (typeof descriptor.value) {
                        case "undefined":
                            result = undefined;
                            break;
                        case "function":
                            result = Reflect.get(target, propKey, receiver);
                            if (target instanceof Array) {
                                if (optimization.has(propKey as any)) {
                                    return function(...args: any[]) {
                                        (target as any).__proxyInternal__.disabled = true;
                                        const res = (result as any).apply(this, args);
                                        (target as any).__proxyInternal__.init();
                                        (target as any).__proxyInternal__.disabled = false;
                                        return res;
                                    }
                                }
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
        defineProperty(target: T, propKey: K, descriptor: any) {
            if (isClass) {
                const previousDescriptor = this.getOwnPropertyDescriptor(target, propKey);
                const newDescriptor = {...previousDescriptor, ...descriptor};
                Reflect.defineProperty(target, propKey, newDescriptor);
            }
            else {
                Reflect.defineProperty(target, propKey, descriptor);
            }
            return true;
        },
        set(target: T, propKey: K, value: any, receiver: any) {
            // member decorated with @UndoDoNotTrack should not be recorded
            const set = (target as any).__proxyInternal__.constructor.doNotTrack;
            // if the instance is not initialized, the set should not be recorded
            if (!(target as any).__proxyInternal__.inited || set.has(propKey) || (target as any).__proxyInternal__.disabled) {
                return Reflect.set(target, propKey, value, receiver);
            }
            // we should not save setter getter otherwise the logic inside them will be bypassed
            if ((getInheritedPropertyDescriptor(target, propKey) || {}).set) {
                return Reflect.set(target, propKey, value, receiver);
            }
            if (value && (value as any).__proxyInternal__) {
                __initialization__(value, (target as any).__proxyInternal__.master);
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
            const history: Map<K, History<T[K]>> = (target as any).__proxyInternal__.history;
            if (!history.has(propKey)) {
                history.set(propKey,
                    new History<any>(
                        (target as any).__proxyInternal__.master,
                    value
                ));
            }
            else {
                history.get(propKey).set(value);
            }
            Reflect.set(target, propKey, value, receiver); // keep object up to date to allow iteration over it
            return result;
        },
        has(target: T, propKey: K) {
            if (!(target as any).__proxyInternal__.inited || (target as any).__proxyInternal__.disabled) {
                return Reflect.has(target, propKey);
            }
            const history: Map<K, History<T[K]>> = (target as any).__proxyInternal__.history;
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
            const history: Map<K, History<T[K]>> = (target as any).__proxyInternal__.history;
            if (history.has(propKey)) {
                history.get(propKey).set(deleted as any);
            }
            return Reflect.deleteProperty(target, propKey)
        },
        ownKeys(target: T) {
            let res = Reflect.ownKeys(target)
            if (isClass) {
                const parentOwnKey = Array.from(Reflect.ownKeys(Object.getPrototypeOf(target)));
                res = res.concat(parentOwnKey.filter((elt) => { return res.indexOf(elt) === -1; }));
            }
            return res;
        },
        getOwnPropertyDescriptor(target: T, propKey: K) {
            const res = Reflect.getOwnPropertyDescriptor(target, propKey);
            if (res === undefined && isClass === false && Object.getPrototypeOf(target)) {
                return Reflect.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(target)), propKey);
            }
            else if (res === undefined && isClass === true) {
                return Reflect.getOwnPropertyDescriptor(Object.getPrototypeOf(target), propKey);
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

