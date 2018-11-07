import { proxyHandler } from "./handler";
import { MasterIndex, History } from "./core";
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
        const proxyInternalClass =  class ProxyInternal {
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

    return function aux<T extends Constructor<any>>(ctor: T) {
        const proxyInternalClass = proxyInternal(ctor);

        const anonymousClass = class ProxyWarper extends ctor {
            // tslint:disable-next-line:variable-name
            __proxyInternal__: any;
            // tslint:disable-next-line:variable-name
            static __proxyInternal__: any;

            constructor(...args: any[]) {
                super(...args);
                let descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__proxyInternal__"
                ) || { writable: true };
                const proxyInternalInstance = new (proxyInternalClass as any)();
                proxyInternalInstance.target = this;
                descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__proxyInternal__"
                ) || { writable: true };
                Object.defineProperty(this, "__proxyInternal__", {
                    ...descriptor,
                    enumerable: false,
                    value: proxyInternalInstance
                });
                return new Proxy(this, proxyHandler(this.__proxyInternal__, false)) as any;
            }
        };

        setForceWatch(anonymousClass, forceWatch);
        proxyInternalClass.nonEnumerableWatch = getForceWatch(anonymousClass);

        // static
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
        Object.defineProperty(anonymousClass, "name", {
            ...descriptor,
            enumerable: false,
            value: `Warper of ${ctor.name}`
        });
        Object.defineProperty(anonymousClass, "__originalConstructor__", {
            enumerable: false,
            value: ctor
        });
        return new Proxy(anonymousClass, proxyHandler(anonymousClass.__proxyInternal__, true)) as any;
    }
}
