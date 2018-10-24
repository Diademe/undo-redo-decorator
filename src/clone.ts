import { GenericIdentityFunc, Key } from "./type";
enum Clone {
    Class,
    Function
}

export const cloneMap = new Map<
    Object,
    [Clone.Class, Key] | [Clone.Function, GenericIdentityFunc<Object>]
>();

export namespace clone {
    export function setClass<T, K extends keyof T>(obj: T, key: K) {
        cloneMap.set(obj.constructor, [Clone.Class, key]);
    }
    export function setFunction<T extends Object>(ctor: new(args: any[]) => T, func: GenericIdentityFunc<T>) {
        cloneMap.set(ctor, [Clone.Function, func]);
    }
    export function get<T extends Object>(ctor1: any, instance: T): T {
        const a = cloneMap.has(ctor1);
        const b = cloneMap.has(instance.constructor);
        if (!a && !b) { // default copy
            const res = Object.create(Object.getPrototypeOf(instance));
            // tslint:disable-next-line:prefer-object-spread
            return Object.assign(res, instance);
        }
        const [clone, keyFunc] = cloneMap.get(ctor1) || cloneMap.get(instance.constructor);
        switch (clone) {
            case Clone.Class:
                return Reflect.get(instance, keyFunc as Key).bind(instance)();
            case Clone.Function:
                return (keyFunc as GenericIdentityFunc<T>)(instance);
        }
    }
}
