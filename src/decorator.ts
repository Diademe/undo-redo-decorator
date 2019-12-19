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
    undoInternalClass.doNotTrack = findAncestorDecorated(doNotTrackMap, ctor) as Set<K> || new Set<K>();
    undoInternalClass.doNotRecurs = findAncestorDecorated(doNotRecursMap, ctor) as Set<K> || new Set<K>();
    undoInternalClass.afterLoad = findAncestorDecorated(afterLoadMap, ctor) as Set<K> || new Set<K>();
    const undoInternalClass = UndoInternal;
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
