import { proxyHandler } from "./handler";
import { MasterIndex, History } from "./core";
import { Class, Key } from "./type";
import { getAllPropertyNames, initializationMap, doNotTrackMap } from "./utils";

// save map (class -> non enumerable) that we need to watch
const forceWatchMap = new Map<any, Key[]>();
function setForceWatch(target: any, forceWatch: Key[]) {
    let metaData = forceWatchMap.get(target);
    if (metaData === void 0) {
        metaData = [];
        forceWatchMap.set(target, metaData);
    }
    metaData.push(...forceWatch);
}

function getForceWatch(target: any): Key[] {
    const metaData: Key[] = []
    do {
        metaData.push(...(forceWatchMap.get(target) || []))
    } while (target = Object.getPrototypeOf(target))
    return metaData;
}

/**
 * function decorator. this function will be called after object creation
 */
export function UndoInit(target: any, propKey: Key) {
    if (initializationMap.has(target.constructor)) {
        console.warn(`init has already been applied to the class ${target.constructor.name}`);
    }
    initializationMap.set(target.constructor, propKey);
}

function findDoNotTrack(target: any) {
    // if target is associated with a set, we should not clone the set
    if (doNotTrackMap.has(target.constructor)) {
        return doNotTrackMap.get(target.constructor);
    }
    // if a parent of the target is associated with a set,
    // we should clone the set (so that child doNotTrack doesn't impact the parent)
    while (target = Object.getPrototypeOf(target)) {
        if (doNotTrackMap.has(target.constructor)) {
            return new Set(doNotTrackMap.get(target.constructor));
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
        const set = findDoNotTrack(target);
        set.add(propKey);
        doNotTrackMap.set(target.constructor, set);
    }
}

function proxyInternal<T extends Class<any>, K extends keyof T> (ctor: T) {
    const proxyInternalClass =  class ProxyInternal {
        // watch non enumerable property of an object
        static nonEnumerableWatch: Key[];
        static initialization: Function[];
        static doNotTrack: Set<Key>;
        history: Map<K, History<T>>;
        master: MasterIndex;
        inited = false;
        target: T;

        constructor() {
            this.history = new Map<K, History<T>>();
        }

        init() {
            if (!this.inited) {
                for (const [propKey, descriptor] of getAllPropertyNames(
                    this.target
                )) {
                    if (
                        !(
                            descriptor.writable === false ||
                            typeof descriptor.value === "function" ||
                            [
                                "constructor",
                                "__proxyInternal__"
                            ].indexOf(propKey) !== -1
                        )
                    ) {
                        this.history.set(
                            propKey as any,
                            new History<any>(
                                this.master,
                                descriptor.value
                            )
                        );
                    }
                }
                this.inited = true;
            }
        }
    }
    proxyInternalClass.doNotTrack = doNotTrackMap.get(ctor) || new Set<Key>();
    const descriptor = Object.getOwnPropertyDescriptor(
        proxyInternalClass,
        "__proxyInternal__"
    ) || { writable: true };
    Object.defineProperty(proxyInternalClass, "name", {
        ...descriptor,
        enumerable: false,
        value: `internal of ${ctor.name}`
    });
    return proxyInternalClass;
}

function wrapper <T extends Class<any>>(forceWatch: Key[], proxify: boolean) {
    return (ctor: T) => {
        const proxyInternalClass = proxyInternal(ctor);
        // bug of typescript : can not extends abstract class from parameters
        const anonymousClass = class ProxyWrapper extends (ctor as any) {
            // tslint:disable-next-line:variable-name
            __proxyInternal__: any;
            // tslint:disable-next-line:variable-name
            static __proxyInternal__: any;

            constructor(...args: any[]) {
                super(...args);
                const proxyInternalInstance = new (proxyInternalClass as any)();
                proxyInternalInstance.target = this;
                const descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__proxyInternal__"
                ) || { writable: true };
                Object.defineProperty(this, "__proxyInternal__", {
                    ...descriptor,
                    enumerable: false,
                    value: proxyInternalInstance
                });
                if (proxify === true) {
                    return new Proxy(this, proxyHandler(false)) as any;
                }
            }
        };

        setForceWatch(anonymousClass, forceWatch);
        proxyInternalClass.nonEnumerableWatch = getForceWatch(anonymousClass);

        // look for the UndoInit decorator
        let proto = ctor;
        do {
            if (initializationMap.has(proto)) {
                const initMember = initializationMap.get(proto)
                proxyInternalClass.initialization = Reflect.get(proto.prototype, initMember);
                break;
            }
        } while (proto = Object.getPrototypeOf(proto));

        // check that no parents is UndoableNoParent
        if (proxify === true && (ctor as any).__NoParent__ === true) {
            throw Error(`@UndoableNoParent is already applied in the prototype chain of ${ctor.name}`)
        }

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
        Object.defineProperty(anonymousClass, "__NoParent__", {
            enumerable: false,
            value: true
        });
        return new Proxy(anonymousClass, proxyHandler(true)) as any;
    }
}

/**
 * class decorator that must decorate the top most class
 * (more precisely, it should appear only once in the prototype chain of an object)
 * Don't decorate a class with both @Undoable and @Undoable
 * @param forceWatch array of non enumerable member to watch
 */
export function UndoableNoParent(
    forceWatch: Key[] = []
) {
    return wrapper(forceWatch, true);
}
/**
 * class decorator that replace the class and return a proxy around it
 * Don't decorate a class with both @Undoable and @Undoable
 * @param forceWatch array of non enumerable member to watch
 */
export function Undoable(
    forceWatch: Key[] = []
) {
    return wrapper(forceWatch, false);
}
