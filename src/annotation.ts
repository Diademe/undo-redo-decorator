import { proxyHandler } from "./handler";
import { MasterIndex, History } from "./core";
import { clone } from "./clone";
import { Constructor, Key } from "./type";
import { getAllPropertyNames } from "./utils";

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
 * class decorator that replace the class and return a proxy around it
 * @param forceWatch non enumerable member to watch
 */
export function Undoable(
    forceWatch: Key[] = []
) {
    function proxyInternal<T extends Constructor<any>, K extends keyof T> (ctor: T) {
        const proxyInternal =  class ProxyInternal {
            static originalConstructor = ctor;
            // watch non enumerable property of an object
            static nonEnumerableWatch: Key[];
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
        return proxyInternal;
    }

    return function aux<T extends Constructor<any>>(ctor: T) {
        const proxyInternalClass = proxyInternal(ctor);
        const anonymousClass = class ProxyWarper extends ctor {
            // tslint:disable-next-line:variable-name
            __proxyInternal__: any;
            // tslint:disable-next-line:variable-name
            static __proxyInternal__: any;

            constructor(...args: any[]) {
                super(...args);
                const descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__proxyInternal__"
                ) || { writable: true };
                const proxyInternalInstance = new (proxyInternalClass as any)();
                proxyInternalInstance.target = this;
                Object.defineProperty(this, "__proxyInternal__", {
                    ...descriptor,
                    enumerable: false,
                    value: proxyInternalInstance
                });
                return new Proxy(this, proxyHandler(this.__proxyInternal__)) as any;
            }
        };

        setForceWatch(anonymousClass, forceWatch);
        proxyInternalClass.nonEnumerableWatch = getForceWatch(anonymousClass);
        // hide internal property TODO doesn't work (instance descriptor doesn't inherit from class)
        for (const ownProperty of Object.keys(anonymousClass.prototype)) {
            const descriptor = Object.getOwnPropertyDescriptor(
                anonymousClass.prototype,
                ownProperty
            ) || { writable: true };
            Object.defineProperty(anonymousClass.prototype, ownProperty, {
                ...descriptor,
                enumerable: false
            });
        }
        const descriptor = Object.getOwnPropertyDescriptor(
            anonymousClass,
            "__proxyInternal__"
        ) || { writable: true };
        const proxyInternalInstance = new (proxyInternalClass as any)();
        proxyInternalInstance.target = anonymousClass;
        Object.defineProperty(anonymousClass, "__proxyInternal__", {
            ...descriptor,
            enumerable: false,
            value: proxyInternalInstance
        });
        return new Proxy(anonymousClass, proxyHandler(anonymousClass.__proxyInternal__)) as any;
    }
}

export function cloneClass<T extends Object, K extends keyof T>(
    target: T,
    keyName: K,
    _: TypedPropertyDescriptor<() => T>
): void {
    if (Reflect.get(target, "__isProxy__")) {
        throw Error("try to set a clone on an un-managed class");
    }
    clone.setClass(target, keyName);
}

export function cloneFunc<T extends Object>(
    ctor: new (...args: any[]) => T,
    func: (arg: T) => T
): void {
    clone.setFunction(ctor, func);
}
