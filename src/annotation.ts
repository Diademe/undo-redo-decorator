import { proxyHandler } from "./handler";
import { MasterIndex, History } from "./core";
import { clone } from "./clone";
import { Constructor, Key } from "./type";
import { getAllPropertyNames } from "./utils";

/**
 * class decorator that replace the class and return a proxy around it
 * @param forceWatch non enumerable member to watch
 */
export function Undoable(
    forceWatch: Key[] = []
) {
    function proxyInternal<T extends Constructor<any>, K extends keyof T> (ctor: T, target: any) {
        return class ProxyInternal {
            static originalConstructor = ctor;
            // watch non enumerable property of an object
            static nonEnumerableWatch = forceWatch;
            history: Map<K, History<T>>;
            master: MasterIndex;
            inited = false;
            target: T;

            constructor() {
                this.history = new Map<K, History<T>>();
                this.target = target;
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
    }
    return function aux<T extends Constructor<any>, K extends keyof T>(ctor: T) {

        const anonymousClass = class ProxyWarper extends ctor {
            // tslint:disable-next-line:variable-name
            __proxyInternal__: any;

            constructor(...args: any[]) {
                super(...args);
                const descriptor = Object.getOwnPropertyDescriptor(
                    this,
                    "__proxyInternal__"
                ) || { writable: true };
                this.__proxyInternal__ = new (proxyInternal(ctor, this) as any)()
                Object.defineProperty(this, "__proxyInternal__", {
                    ...descriptor,
                    enumerable: false
                });
                return new Proxy(this, proxyHandler(this.__proxyInternal__)) as any;
            }
        };

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
        return anonymousClass;
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
