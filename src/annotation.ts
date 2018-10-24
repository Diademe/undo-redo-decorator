import { proxyHandler } from "./handler";
import { MasterIndex, History } from "./core";
import { clone } from "./clone";
import { Constructor } from "./type";
import { getAllPropertyNames } from "./utils";

/**
 * class decorator that replace the class and return a proxy around it
 * @param ctor the constructor of the decorated class
 */
export function Undoable<T extends Constructor<any>, K extends keyof T>(
    ctor: T
) {
    const anonymousClass = class Tmp extends ctor {
        // tslint:disable-next-line:variable-name
        __originalConstructor__ = ctor;
        // tslint:disable-next-line:variable-name
        __history__: Map<K, History<T>>;
        // tslint:disable-next-line:variable-name
        __master__: MasterIndex;
        // tslint:disable-next-line:variable-name
        __proxy__: this;
        // tslint:disable-next-line:variable-name
        __inited__ = false;
        constructor(...args: any[]) {
            super(...args);
            this.__history__ = new Map<K, History<T>>();
            this.__proxy__ = new Proxy(this, proxyHandler());
            return this.__proxy__;
        }
        __init__() {
            if (!this.__inited__) {
                for (const [propKey, descriptor] of getAllPropertyNames(this)) {
                    if (!
                        (descriptor.writable === false ||
                        typeof this[propKey] === "function" ||
                        [
                                "constructor",
                                "prototype",
                                "__proxy__",
                                "__master__",
                                "__inited__",
                                "__history__",
                                "__originalConstructor__"
                            ].indexOf(propKey) !== -1)
                    ) {
                        this.__history__.set(
                            propKey as any,
                            new History<any>(
                                this.__master__,
                                (this as any)[propKey]
                            )
                        );
                    }
                }
                this.__inited__ = true;
            }
        }
    };

    return anonymousClass;
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
