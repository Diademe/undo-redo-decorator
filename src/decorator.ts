import { MasterIndex, History } from "./core";
import { Class, Key, Visitor } from "./type";
import { getAllPropertyNames, doNotTrackMap, notDefined, afterLoadMap, doNotRecursMap } from "./utils";

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
 * property decorator. Property decorated will be monitored by Undo Redo, but that wont propagate the recursion
 * used to flatten the recursion
 */
export function UndoDoNotRecurs(target: any, propKey: Key) {
    if (typeof target[propKey] === "function") {
        console.warn("UndoDoNotRecurs is unnecessary on function as they are not monitored by Undo Redo Proxy");
    }
    else {
        const set = findAncestorDecorated(doNotRecursMap, target.constructor);
        set.add(propKey);
        doNotRecursMap.set(target.constructor, set);
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

function undoInternal<T extends Class<any>, K extends keyof T> (ctor: new(...args: any[]) => T) {
    const undoInternalClass =  class UndoInternal {
        // watch non enumerable property of an object
        public static nonEnumerables: K[];
        public static doNotTrack: Set<K>;
        public static doNotRecurs: Set<K>;
        public static afterLoad: Set<K>;
        public history: Map<K, History<T, K>>; // associate a property key to its history
        public historyCollection: Map<any, History<T, any>>; // associate a key to its history (map and set)
        public master: MasterIndex;
        public target: T;
        private action: number; // prevent recursion to loop

        constructor() {
            this.history = new Map<K, History<T, K>>();
            this.historyCollection = new Map<any, History<T, any>>();
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
            let value: any;
            if (this.target instanceof Set) {
                value = this.target.has(propKey) ? true : notDefined;
            }
            else if (this.target instanceof Map) {
                value = this.target.has(propKey) ? this.target.get(propKey) : notDefined;
            }
            else {
                value = propKey in this.target ? this.target[propKey] : notDefined;
            }
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
            const deleteProperty = () => {
                if (this.target instanceof Set || this.target instanceof Map) {
                    this.target.delete(propKey);
                }
                else {
                    delete this.target[propKey];
                }
            }
            const get = () => { // get the property from the object
                if (this.target instanceof Set) {
                    return this.target.has(propKey)
                }
                else if (this.target instanceof Map) {
                    return this.target.get(propKey);
                }
                else {
                    return this.target[propKey];
                }
            }
            const set  = (val: any) => { // set the property from the history to the object
                if (this.target instanceof Set) {
                    if (val) { // val is true
                        this.target.add(propKey);
                    }
                    else {
                        throw Error("You cant set a value to false in a set");
                    }
                }
                else if (this.target instanceof Map) {
                    this.target.set(propKey, val);
                }
                else {
                    this.target[propKey] = val;
                }
            }
            const localHistory = this.history.get(propKey);
            if (localHistory) {
                const valHistory = localHistory.get();
                if (valHistory === notDefined) {
                    deleteProperty();
                }
                else if (get() !== valHistory) { // trick to avoid rewrite non writable property
                    set(valHistory);
                }
            }
            else {
                deleteProperty();
            }
        }

        dispatchAndRecurse(propKey: K, v: Visitor, recurse: boolean): void {
            if (v === Visitor.save) {
                this.save(propKey);
            }
            else if (v === Visitor.load) {
                this.load(propKey);
            }
            if (recurse) {
                // dispatch on key (example : object key of a map)
                const key = propKey;
                if (key && (key as any).__undoInternal__) {
                    (key as any).__undoInternal__.visit(v, this.master, this.action);
                }
                // no value associated to a key for Set
                if (this.target instanceof Set) {
                    return;
                }
                const val = this.target instanceof Map ? this.target.get(key) : this.target[propKey];
                if (val && (val as any).__undoInternal__) {
                    (val as any).__undoInternal__.visit(v, this.master, this.action);
                }
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
            const doNotTrack = UndoInternal.doNotTrack;
            const doNotRecurs = UndoInternal.doNotRecurs;

            if (this.target instanceof Set || this.target instanceof Map) {
                for (const key of this.target.keys()) {
                    this.dispatchAndRecurse(key, v, true);
                    memberDispatched.add(key);
                }
            }
            else {

                for (const [propKey, descriptor] of getAllPropertyNames<T, K>(this.target)) {
                    if (!(!descriptor.enumerable
                        || descriptor.writable === false
                        || typeof descriptor.value === "function"
                        || propKey === "constructor"
                        || propKey === "prototype"
                        || doNotTrack.has(propKey))) {
                        this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey));
                        memberDispatched.add(propKey);
                    }
                }
            }

            // non enumerables
            UndoInternal.nonEnumerables.forEach((nonEnumerable: any) => {
                this.dispatchAndRecurse(nonEnumerable, v, !doNotRecurs.has(nonEnumerable));
                memberDispatched.add(nonEnumerable);
            });

            for (const [propKey] of this.history) {
                if (!memberDispatched.has(propKey)) {
                    this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey) && (this.target instanceof Set || this.target instanceof Map));
                }
            }

            if (v === Visitor.load) {
                for (const propKey of UndoInternal.afterLoad) {
                    (this.target as any)[propKey]();
                }
            }
        }
    }
    undoInternalClass.doNotTrack = findAncestorDecorated(doNotTrackMap, ctor) as Set<K> || new Set<K>();
    undoInternalClass.doNotRecurs = findAncestorDecorated(doNotRecursMap, ctor) as Set<K> || new Set<K>();
    undoInternalClass.afterLoad = findAncestorDecorated(afterLoadMap, ctor) as Set<K> || new Set<K>();
    const descriptor = Object.getOwnPropertyDescriptor(
        undoInternalClass,
        "name"
    ) || { writable: true };
    Object.defineProperty(undoInternalClass, "name", {
        ...descriptor,
        enumerable: false,
        value: `internal of ${ctor.name}`
    });
    return undoInternalClass;
}

function wrapper <T extends Class<any>, K extends keyof T>(forceWatch: K[]) {
    return (ctor: new(...args: any[]) => any) => {
        const undoInternalClass = undoInternal<T, K>(ctor);
        // bug of typescript : can not extends abstract class from parameters
        const anonymousClass = class ProxyWrapper extends (ctor as any) {
            // tslint:disable-next-line:variable-name
            __undoInternal__: InstanceType<ReturnType<typeof undoInternal>>;
            // tslint:disable-next-line:variable-name
            static __undoInternal__: InstanceType<ReturnType<typeof undoInternal>>;

            constructor(...args: any[]) {
                super(...args);
                // do not overwrite the __undoInternal__ member
                // if A inherit from B and both A and B are @Undoable, B constructor create the __undoInternal__
                const undoInternalInstance = this.__undoInternal__ ? this.__undoInternal__.inherit(new undoInternalClass() as any) : new undoInternalClass();
                undoInternalInstance.target = this as any;
                const descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__undoInternal__"
                ) || { writable: true };
                Object.defineProperty(this, "__undoInternal__", {
                    ...descriptor,
                    enumerable: false,
                    value: undoInternalInstance
                });
            }
        };

        setForceWatch(anonymousClass, forceWatch);
        undoInternalClass.nonEnumerables = getForceWatch(anonymousClass) as any;

        // static
        const undoInternalInstance = new (undoInternalClass as any)();
        undoInternalInstance.target = anonymousClass;
        Object.defineProperty(anonymousClass, "__undoInternal__", {
            enumerable: false,
            value: undoInternalInstance
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
