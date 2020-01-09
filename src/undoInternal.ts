import { Class, Visitor, Key } from "./type";
import { MasterIndex, History } from "./core";
import { notDefined, getAllPropertyNames } from "./utils";

type T = Class<any>;
type K = keyof T;
export class UndoInternal {
    /** associate a property key to its history */
    protected history: Map<K, History<T, K>>;
    /** associate a key to its history (map and set) */
    protected historyCollection: Map<any, History<T, K>>;
    public master: MasterIndex;
    /** the class being monitored */
    public target: T;
    /** used to prevent recursion to loop */
    protected action: number;

    constructor(target: T) {
        this.target = target;
        this.history = new Map<K, History<T, K>>();
        this.historyCollection = new Map<any, History<T, K>>();
        this.action = -1;
    }

    /** create UndoInternal and bind it to target */
    static Initialize(target: T) {
        const undoInternal = new UndoInternal(target);
        Object.defineProperty(target, "__undoInternal__", {
            writable: false,
            enumerable: false,
            configurable: false,
            value: undoInternal
        });
    }

    collapse(propKey: K): void {
        this.history.get(propKey).collapse();
    }

    /** save the current value into the history of the propKey */
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
                    value as K
                )
            );
        }
    }

    /** overrides the current value with the value stored in the propKey history */
    load(propKey: K) {
        const deleteProperty = () => {
            if (this.target instanceof Set || this.target instanceof Map) {
                this.target.delete(propKey);
            }
            else {
                delete this.target[propKey];
            }
        }
        /** get the property from the object */
        const get = () => {
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
        /** set the property from the history to the object */
        const set  = (val: any) => {
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

    dispatchAndRecurse(propKey: K, v: Visitor, recurse: boolean, shallowDepth: number): void {
        if (v === Visitor.save) {
            this.save(propKey);
        }
        else if (v === Visitor.load) {
            this.load(propKey);
        }
        else if (v === Visitor.collapse) {
            this.collapse(propKey);
        }
        if (recurse) {
            // dispatch on key (example : object key of a map)
            const key = propKey;
            // if key type is undoable
            if (hasUndoInternalInformation(key)) {
                // initialize key if it doesn't have undoInternal
                if (!hasUndoInternal(key)) {
                    UndoInternal.Initialize(key as any);
                }
                (key as unknown as HasUndoInternal).
                    __undoInternal__.visit(v, this.master, this.action, shallowDepth - 1);
            }
            // no value associated to a key for Set
            if (this.target instanceof Set) {
                return;
            }
            const val = this.target instanceof Map ? this.target.get(key) : this.target[propKey];
            // if value type is undoable
            if (hasUndoInternalInformation(val)) {
                if (!hasUndoInternal(val)) {
                    UndoInternal.Initialize(val);
                }
                (val as HasUndoInternal).__undoInternal__.visit(v, this.master, this.action, shallowDepth - 1);
            }
        }
    }

    visit(v: Visitor, master: MasterIndex, action: number, shallowDepth: number): void {
        if (this.action === action || shallowDepth === -1) {
            return;
        }
        this.action = action;
        if (this.master !== undefined && this.master !== master) {
            throw Error("an object was affected to two UndoRedo");
        }
        this.master = master;

        const memberDispatched = new Set<K>();

        const {
            afterLoad,
            doNotTrack,
            doNotRecurs,
            nonEnumerables
        } = this.target.constructor.prototype.__undoInternalInformation__ as UndoInternalInformation;

        if (this.target instanceof Set || this.target instanceof Map) {
            for (const key of this.target.keys()) {
                this.dispatchAndRecurse(key, v, true, shallowDepth);
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
                    // member decorated with @UndoDoNotTrack should be ignored
                    || doNotTrack.has(propKey))) {
                    this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey), shallowDepth);
                    memberDispatched.add(propKey);
                }
            }
        }

        // non enumerables
        for (const nonEnumerable of nonEnumerables) {
            this.dispatchAndRecurse(nonEnumerable, v, !doNotRecurs.has(nonEnumerable), shallowDepth);
            memberDispatched.add(nonEnumerable);

        }

        for (const [propKey] of this.history) {
            if (!memberDispatched.has(propKey)) {
                this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey) && (this.target instanceof Set || this.target instanceof Map), shallowDepth);
            }
        }

        // afterLoad
        if (v === Visitor.load) {
            for (const propKey of afterLoad) {
                (this.target as any)[propKey]();
            }
        }
    }
}

/**
 * each undoable (target) class has a member __undoInternalInformation__ containing an instance of this class.
 * it carry information that are revalant a class level (which property to not track for example).
 */
export class UndoInternalInformation {
    public nonEnumerables: Key[];
    public doNotTrack: Set<Key>;
    public doNotRecurs: Set<Key>;
    public afterLoad: Set<Key>;

    constructor(baseCtor: Function) {
        if (baseCtor.prototype.__undoInternalInformation__) {
            this.clone(baseCtor.prototype.__undoInternalInformation__)
        }
        else {
            this.nonEnumerables = [];
            this.doNotTrack = new Set();
            this.doNotRecurs = new Set();
            this.afterLoad = new Set();
        }

    }

    /**
     * extends information from the target class
     * @param from the constructor of the target class
     */
    protected clone(from: UndoInternalInformation) {
        this.nonEnumerables = [...from.nonEnumerables];
        this.doNotTrack = new Set(from.doNotTrack);
        this.doNotRecurs = new Set(from.doNotRecurs);
        this.afterLoad = new Set(from.afterLoad);
    }

    /**
     * add to the non enumerable list ot the target class
     * @param arg non enumerable key to be watched
     */
    public addNonEnumerables(arg: Key[]) {
        this.nonEnumerables.push(...arg);
    }
}

/**
 * if ctor doesn't have `__undoInternalInformation__`, create it. it is created regardless of
 * `__undoInternalInformation__` being inherited
 * @param ctor the target class to which the `__undoInternalInformation__` will be added
 */
export function initUndoInternalInformation(ctor: Function) {
    if (!Object.getOwnPropertyDescriptor(ctor.prototype, "__undoInternalInformation__")) {
        Object.defineProperty(ctor.prototype, "__undoInternalInformation__", {
            enumerable: false,
            value: new UndoInternalInformation(ctor)
        });
    }
}

export function hasUndoInternalInformation(instance: any): boolean {
    return !!(instance && instance.constructor.prototype.__undoInternalInformation__);
}


export interface HasUndoInternal {
    __undoInternal__: UndoInternal;
}

export function hasUndoInternal(instance: HasUndoInternal | any): instance is HasUndoInternal {
    return instance && instance.__undoInternal__ instanceof UndoInternal;
}
