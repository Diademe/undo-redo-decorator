import { MasterIndex, History } from "./core";
import { Class, Key, Visitor } from "./type";
import { getAllPropertyNames, doNotTrackMap, notDefined, afterLoadMap } from "./utils";

// save map (class -> non enumerable) that we need to watch
const forceWatchMap = new Map<any, Key[]>();
function setForceWatch(target: any, forceWatch: Key[]) {
    let metaData = forceWatchMap.get(target);
    if (metaData === undefined) {
        metaData = [];
        forceWatchMap.set(target, metaData);
    }
    metaData.push(...forceWatch);
}

function getForceWatch<T, K extends keyof T>(target: T): K[] {
    const metaData: K[] = []
    do {
        metaData.push(...(forceWatchMap.get(target) as any || []));
    } while (target = Object.getPrototypeOf(target))
    return metaData;
}

function findAncestorDecorated(map: Map<any, Set<Key>>, ctor: any) {
    // if target is associated with a set, we should not clone the set
    if (map.has(ctor)) {
        return map.get(ctor);
    }
    // if a parent of the target is associated with a set,
    // we should clone the set (so that child ctor doesn't impact the parent)
    while (ctor = Object.getPrototypeOf(ctor)) {
        if (map.has(ctor)) {
            return new Set(map.get(ctor));
        }
    };
    return new Set();
}

/**
 * property decorator. Property decorated will not be monitored by Undo Redo
 */
export function UndoDoNotTrack(target: any, propKey: Key) {
    if (typeof target[propKey] === "function") {
        console.warn("UndoDoNotTrack is unnecessary on function as they are not monitored by Undo Redo Proxy");
    }
    else {
        const set = findAncestorDecorated(doNotTrackMap, target.constructor);
        set.add(propKey);
        doNotTrackMap.set(target.constructor, set);
    }
}

/**
 * Function decorator. Function decorated will be executed after each redo and after each undo.
 */
export function UndoAfterLoad(target: any, propKey: Key) {
    if (typeof target[propKey] === "function") {
        const set = findAncestorDecorated(afterLoadMap, target.constructor);
        set.add(propKey);
        afterLoadMap.set(target.constructor, set);
    }
    else {
        console.warn(`AfterLoad is applied to the property ${propKey as string}, but ${propKey as string} is not a function`);
    }
}

function proxyInternal<T extends Class<any>, K extends keyof T> (ctor: new(...args: any[]) => T) {
    const proxyInternalClass =  class ProxyInternal {
        // watch non enumerable property of an object
        public static nonEnumerables: K[];
        public static doNotTrack: Set<K>;
        public static afterLoad: Set<K>;
        public history: Map<K, History<T, K>>;
        public master: MasterIndex;
        public target: T;
        private action: number;

        constructor() {
            this.history = new Map<K, History<T, K>>();
            this.action = -1;
        }

        inherit<T extends{history: any, master: MasterIndex, target: any, action: number}>(arg: T): T {
            arg.history = this.history;
            arg.master = this.master;
            arg.target = this.target;
            arg.action = this.action;
            return arg;
        }

        save(propKey: K): void {
            const value: T[K] = propKey in this.target ? this.target[propKey] : notDefined as any;
            if (this.history.has(propKey)) {
                this.history.get(propKey).set(value);
            }
            else {
                this.history.set(
                    propKey,
                    new History<T, K>(
                        this.master,
                        value
                    )
                );
            }
        }

        load(propKey: K) {
            const localHistory = this.history.get(propKey);
            if (localHistory) {
                const val = localHistory.get();
                if (val === notDefined) {
                    delete this.target[propKey];
                }
                else if (this.target[propKey] !== val) { // trick to avoid rewrite non writable property
                    this.target[propKey] = val as T[K];
                }
            }
            else {
                delete this.target[propKey];
            }
        }

        dispatchAndRecurse(propKey: K, v: Visitor): void {
            if (v === Visitor.save) {
                this.save(propKey);
            }
            else if (v === Visitor.load) {
                this.load(propKey);
            }
            // dispatch on key (example : object key of a map)
            const key = propKey;
            if (key && (key as any).__proxyInternal__) {
                (key as any).__proxyInternal__.visit(v, this.master, this.action);
            }
            const val = this.target[propKey];
            if (val && (val as any).__proxyInternal__) {
                (val as any).__proxyInternal__.visit(v, this.master, this.action);
            }
        }

        visit(v: Visitor, master: MasterIndex, action: number): void {
            if (this.action === action) {
                return;
            }
            this.action = action;
            if (this.master !== undefined && this.master !== master) {
                throw Error("an object was affected to two UndoRedo");
            }
            this.master = master;

            const memberDispatched = new Set<K>();
            // member decorated with @UndoDoNotTrack should be ignored
            const doNotTrack = ProxyInternal.doNotTrack;
            for (const [propKey, descriptor] of getAllPropertyNames<T, K>(this.target)) {
                if (!(!descriptor.enumerable
                    || descriptor.writable === false
                    || typeof descriptor.value === "function"
                    || propKey === "constructor"
                    || propKey === "prototype"
                    || doNotTrack.has(propKey))) {
                    this.dispatchAndRecurse(propKey, v);
                    memberDispatched.add(propKey);
                }
            }

            // non enumerables
            ProxyInternal.nonEnumerables.forEach((nonEnumerable: any) => {
                this.dispatchAndRecurse(nonEnumerable, v);
                memberDispatched.add(nonEnumerable);
            });

            for (const [propKey, history] of this.history) {
                if (!memberDispatched.has(propKey)) {
                    this.dispatchAndRecurse(propKey, v);
                }
            }

            if (v === Visitor.load) {
                for (const propKey of ProxyInternal.afterLoad) {
                    (this.target as any)[propKey]();
                }
            }
        }
    }
    proxyInternalClass.doNotTrack = findAncestorDecorated(doNotTrackMap, ctor) as Set<K> || new Set<K>();
    proxyInternalClass.afterLoad = findAncestorDecorated(afterLoadMap, ctor) as Set<K> || new Set<K>();
    const descriptor = Object.getOwnPropertyDescriptor(
        proxyInternalClass,
        "name"
    ) || { writable: true };
    Object.defineProperty(proxyInternalClass, "name", {
        ...descriptor,
        enumerable: false,
        value: `internal of ${ctor.name}`
    });
    return proxyInternalClass;
}

function wrapper <T extends Class<any>, K extends keyof T>(forceWatch: K[]) {
    return (ctor: new(...args: any[]) => any) => {
        const proxyInternalClass = proxyInternal<T, K>(ctor);
        // bug of typescript : can not extends abstract class from parameters
        const anonymousClass = class ProxyWrapper extends (ctor as any) {
            // tslint:disable-next-line:variable-name
            __proxyInternal__: InstanceType<ReturnType<typeof proxyInternal>>;
            // tslint:disable-next-line:variable-name
            static __proxyInternal__: InstanceType<ReturnType<typeof proxyInternal>>;

            constructor(...args: any[]) {
                super(...args);
                // do not overwrite the __proxyInternal__ member
                // if A inherit from B and both A and B are @Undoable, B constructor create the __proxyInternal__
                const proxyInternalInstance = this.__proxyInternal__ ? this.__proxyInternal__.inherit(new proxyInternalClass() as any) : new proxyInternalClass();
                proxyInternalInstance.target = this as any;
                const descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__proxyInternal__"
                ) || { writable: true };
                Object.defineProperty(this, "__proxyInternal__", {
                    ...descriptor,
                    enumerable: false,
                    value: proxyInternalInstance
                });
            }
        };

        setForceWatch(anonymousClass, forceWatch);
        proxyInternalClass.nonEnumerables = getForceWatch(anonymousClass) as any;

        // static
        const proxyInternalInstance = new (proxyInternalClass as any)();
        proxyInternalInstance.target = anonymousClass;
        Object.defineProperty(anonymousClass, "__proxyInternal__", {
            enumerable: false,
            value: proxyInternalInstance
        });
        Object.defineProperty(anonymousClass, "name", {
            enumerable: false,
            value: `Wrapper of ${ctor.name}`
        });
        Object.defineProperty(anonymousClass, "__originalConstructor__", {
            enumerable: false,
            value: ctor
        });

        return anonymousClass;
    }
}

/**
 * class decorator that replace the class and return a proxy around it
 * @param forceWatch array of non enumerable member to watch
 */
export function Undoable(
    forceWatch: Key[] = []
) {
    return wrapper(forceWatch as any) as any;
}
