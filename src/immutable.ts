export enum InstantiationMethod {
    None = 0,
    New = 1,
    ObjectCreate = 2
}

function isPrimitive(test: any): boolean {
    return (test !== Object(test));
}

function clone<T extends Object>(obj: T, instantiationMethod: InstantiationMethod): T {

    if (isPrimitive(obj)) {
        return obj;
    }
    else {
        switch (instantiationMethod) {
            case InstantiationMethod.New:
                return new (obj.constructor as new(...args: any[]) => T)();
            case InstantiationMethod.ObjectCreate:
                return Object.create(obj.constructor.prototype);
            default:
                return {} as T;
        }
    }
}
export namespace immutable {
    export function object<T>(obj: T, instantiationMethod: InstantiationMethod = InstantiationMethod.New): T {
        const res: T = clone(obj, instantiationMethod);
        Object.assign(res, obj);
        return res;
    }

    export function array<K, T extends K[]>(array: T, instantiationMethod: InstantiationMethod = InstantiationMethod.New): T {
        const iterables = Array.from<K>(array);
        iterables.unshift(undefined);
        return new (Function.prototype.bind.apply(array.constructor, iterables))();
    }

    export function set<K>(s: Set<K>): Set<K> {
        const res = new (s.constructor as new() => Set<K>)();
        for (const k of s) {
            res.add(k);
        }
        return res;
    }

    export function map<K, V>(m: Map<K, V>): Map<K, V> {
        const res = new (m.constructor as new() => Map<K, V>)();
        for (const [k, v] of m) {
            res.set(k, v);
        }
        return res;
    }
}