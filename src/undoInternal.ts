import { Class, Visitor } from "./type";
import { MasterIndex, History } from "./core";
import { notDefined, getAllPropertyNames } from "./utils";

type T = Class<any>;
type K = keyof T;
export class UndoInternal {
    // watch non enumerable property of an object
    public static nonEnumerables: K[];
    public static doNotTrack: Set<K>;
    public static doNotRecurs: Set<K>;
    public static afterLoad: Set<K>;
    public history: Map<K, History<T, K>>; // associate a property key to its history
    public historyCollection: Map<any, History<T, K>>; // associate a key to its history (map and set)
    public master: MasterIndex;
    public target: T;
    private action: number; // prevent recursion to loop

    constructor() {
        this.history = new Map<K, History<T, K>>();
        this.historyCollection = new Map<any, History<T, K>>();
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
                    value as K
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

    dispatchAndRecurse(propKey: K, v: Visitor, recurse: boolean, shallowDepth: number): void {
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
                (key as any).__undoInternal__.visit(v, this.master, this.action, shallowDepth - 1);
            }
            // no value associated to a key for Set
            if (this.target instanceof Set) {
                return;
            }
            const val = this.target instanceof Map ? this.target.get(key) : this.target[propKey];
            if (val && (val as any).__undoInternal__) {
                (val as any).__undoInternal__.visit(v, this.master, this.action, shallowDepth - 1);
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

        // member decorated with @UndoDoNotTrack should be ignored
        const doNotTrack = UndoInternal.doNotTrack;
        const doNotRecurs = UndoInternal.doNotRecurs;

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
                    || doNotTrack.has(propKey))) {
                    this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey), shallowDepth);
                    memberDispatched.add(propKey);
                }
            }
        }

        // non enumerables
        UndoInternal.nonEnumerables.forEach((nonEnumerable: any) => {
            this.dispatchAndRecurse(nonEnumerable, v, !doNotRecurs.has(nonEnumerable), shallowDepth);
            memberDispatched.add(nonEnumerable);
        });

        for (const [propKey] of this.history) {
            if (!memberDispatched.has(propKey)) {
                this.dispatchAndRecurse(propKey, v, !doNotRecurs.has(propKey) && (this.target instanceof Set || this.target instanceof Map), shallowDepth);
            }
        }

        if (v === Visitor.load) {
            for (const propKey of UndoInternal.afterLoad) {
                (this.target as any)[propKey]();
            }
        }
    }
}