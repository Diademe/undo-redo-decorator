import { proxyHandler } from "./handler";

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
    }
    return anonymousClass;
}