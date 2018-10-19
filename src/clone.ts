import { GenericIdentityFunc, Key } from "./type";
enum Clone {
    Class,
    Function
}

const cloneMap = new Map<
    Object,
    [Clone.Class, Key] | [Clone.Function, GenericIdentityFunc<Object>]
>();

export namespace clone {
    export function setClass<T, K extends keyof T>(obj: T, key: K) {
        cloneMap.set(obj, [Clone.Class, key]);
    }
    export function setFunction<T>(obj: T, func: GenericIdentityFunc<T>) {
        cloneMap.set(obj, [Clone.Function, func]);
    }
    export function get<T extends Object>(instance: T): T {
        const [clone, keyFunc] = cloneMap.get(instance);
        switch (clone) {
            case Clone.Class:
                return Reflect.get(instance, keyFunc as Key);
            case Clone.Function:
                return (keyFunc as GenericIdentityFunc<T>)(instance);
        }
    }
}
