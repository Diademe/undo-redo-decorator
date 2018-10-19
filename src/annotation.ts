import { proxyHandler } from "./handler";
import { MasterIndex, SuperArray, Index } from "./core";
import { clone } from "./clone";
import { Key, GenericIdentityFunc } from "./type";

/**
 * class decorator that replace the class and return a proxy around it
 * @param ctor the constructor of the decorated class
 */
export function Undoable<T extends { new(...args: any[]): any }>(ctor: T) {
    const anonymousClass = class extends ctor {
        static readonly originalConstructor = ctor;
        constructor(...args: any[]) {
            super(...args);
            return new Proxy (this, proxyHandler(this));
        }
    };
    return anonymousClass;
}

export function CloneClass<T, K extends keyof T>(
    target: T,
    keyName: K,
    _: TypedPropertyDescriptor<() => T>
): void {
    clone.setClass(target, keyName);
}

export function CloneFunc<T extends Object>(
    obj: T,
    func: GenericIdentityFunc<T>
): void {
    clone.setFunction(obj, func);
}
