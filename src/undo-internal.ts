import { Class, Visitor, Key, UndoRedoError } from "./type";
import { MasterIndex } from "./core";
import { History } from "./history";
import { notDefined, getAllPropertyNames } from "./utils";

type T = Class<any>;
type K = keyof T;

export class UndoInternal {
    /** associate a property key to its history */
    protected history: Map<unknown, History>;
    public master: MasterIndex;
    /** the class being monitored */
    public target: T & HasUndoInternal;
    /** used to prevent recursion to loop */
    protected action: number;

    constructor(target: T & HasUndoInternal) {
        this.target = target;
        this.history = new Map();
        this.action = -1;
    }

    /** create UndoInternal and bind it to target */
    public static Initialize(target: T & HasUndoInternal): void {
        const undoInternal = new UndoInternal(target);
        Object.defineProperty(target, "__undoInternal__", {
            writable: false,
            enumerable: false,
            configurable: false,
            value: undoInternal
        });
    }

    protected getValueFromTarget(propKey: unknown): unknown {
        if (this.target instanceof Set) {
            return this.target.has(propKey) ? true : notDefined;
        }
        else if (this.target instanceof Map) {
            return this.target.has(propKey) ? this.target.get(propKey) : notDefined;
        }
        else {
            return (propKey as string | number) in this.target ? this.target[propKey as string | number] : notDefined;
        }
    }

    protected collapse(propKey: unknown): void {
        const value = this.getValueFromTarget(propKey);
        if (this.history.has(propKey)) {
            this.history.get(propKey).collapse(value);
        }
        else {
            this.history.set(propKey, new History(this.master, value));
        }
    }

    /** save the current value into the history of the propKey */
    protected save(propKey: unknown): void {
        const value = this.getValueFromTarget(propKey);
        if (this.history.has(propKey)) {
            const propHistory = this.history.get(propKey);
            propHistory.set(value);
            propHistory.trimFutureHistory();
        }
        else {
            this.history.set(propKey, new History(this.master, value as unknown));
        }
    }

    /** overrides the current value with the value stored in the propKey history */
    protected load(propKey: unknown) {
        const deleteProperty = () => {
            if (this.target instanceof Set || this.target instanceof Map) {
                this.target.delete(propKey);
            }
            else {
                delete this.target[propKey as string | number];
            }
        };
        /** get the property from the object */
        const get = () => {
            if (this.target instanceof Set) {
                return this.target.has(propKey);
            }
            else if (this.target instanceof Map) {
                return this.target.get(propKey);
            }
            else {
                return this.target[propKey as string | number];
            }
        };
        /** set the property from the history to the object */
        const set = (val: any) => {
            if (this.target instanceof Set) {
                if (val) { // val is true
                    this.target.add(propKey);
                }
                else {
                    throw new UndoRedoError("You cant set a value to false in a set");
                }
            }
            else if (this.target instanceof Map) {
                this.target.set(propKey, val);
            }
            else {
                this.target[propKey as string | number] = val;
            }
        };
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

    protected dispatchAndRecurse(propKey: unknown, v: Visitor, recurse: boolean, shallowDepth: number): void {
        switch (v) {
            case Visitor.save: {
                this.save(propKey);
                break;
            }
            case Visitor.load: {
                this.load(propKey);
                break;
            }
            case Visitor.collapse: {
                this.collapse(propKey);
                break;
            }
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
                (key as HasUndoInternal).
                    __undoInternal__.visitInternal(v, this.master, this.action, shallowDepth - 1);
            }
            // dispatch on value
            if (this.target instanceof Set) {
                // no value associated to a key for Set
                return;
            }
            const val = this.getValueFromTarget(propKey);
            // if value type is undoable
            if (hasUndoInternalInformation(val)) {
                if (!hasUndoInternal(val)) {
                    UndoInternal.Initialize(val as T & HasUndoInternal);
                }
                (val as HasUndoInternal).__undoInternal__.visitInternal(v, this.master, this.action, shallowDepth - 1);
            }
        }
    }

    public visit(
        v: Visitor,
        master: MasterIndex,
        action: number,
        shallowDepth: number): void {
        this.visitInternal(v, master, action, shallowDepth);
    }


    protected visitInternal(
        v: Visitor,
        master: MasterIndex,
        action: number,
        shallowDepth: number,
    ): void {
        if (this.action === action || shallowDepth === -1) {
            return;
        }
        this.action = action;
        if (this.master !== undefined && this.master !== master) {
            throw new UndoRedoError("an object was affected to two UndoRedo");
        }
        this.master = master;

        const memberDispatched = new Set<unknown>();

        const {
            afterLoad,
            doNotTrack,
            doNotRecurs,
            nonEnumerables
        } = this.target.constructor.prototype.__undoInternalInformation__ as UndoInternalInformation;

        // keys of collections must be dispatched as hey can be object
        if (this.target instanceof Set || this.target instanceof Map) {
            for (const key of this.target.keys()) {
                this.dispatchAndRecurse(key, v, true /* can't decorate a collection key */, shallowDepth);
                memberDispatched.add(key);
            }
        }
        else {
            for (const [propKey, descriptor] of getAllPropertyNames<T, K>(this.target)) {
                if (!(!descriptor.enumerable
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

        // non enumerable
        for (const nonEnumerable of nonEnumerables) {
            this.dispatchAndRecurse(nonEnumerable, v, !doNotRecurs.has(nonEnumerable), shallowDepth);
            memberDispatched.add(nonEnumerable);

        }

        const isCollection = this.target instanceof Set || this.target instanceof Map;
        for (const [propKey] of this.history) {
            if (!memberDispatched.has(propKey)) {
                this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey) && isCollection, shallowDepth );
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
    public nonEnumerables: unknown[];
    public doNotTrack: Set<unknown>;
    public doNotRecurs: Set<unknown>;
    public afterLoad: Set<Key>;

    constructor(baseCtor: Function) {
        if (baseCtor.prototype.__undoInternalInformation__) {
            this.clone(baseCtor.prototype.__undoInternalInformation__);
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
export const initUndoInternalInformation = (ctor: Function)  => {
    if (!Object.getOwnPropertyDescriptor(ctor.prototype, "__undoInternalInformation__")) {
        Object.defineProperty(ctor.prototype, "__undoInternalInformation__", {
            enumerable: false,
            value: new UndoInternalInformation(ctor)
        });
    }
};

export const hasUndoInternalInformation = (instance: any): boolean  => {
    return !!(instance && instance.constructor.prototype.__undoInternalInformation__);
};

export interface HasUndoInternal {
    __undoInternal__: UndoInternal;
}

export const hasUndoInternal = (instance: HasUndoInternal | any): instance is HasUndoInternal  => {
    return instance && instance.__undoInternal__ instanceof UndoInternal;
};
