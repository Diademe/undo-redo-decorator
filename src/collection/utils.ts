"use strict";
import { Undoable } from "../annotation";

// tslint:disable:no-null-keyword
export enum Flag {
    KeyValue = 1,
    Value = 2,
    Key = 3
}

export function isObject(value: any) {
    return (
        value !== null &&
        (typeof value === "object" || typeof value === "function")
    );
}

export function isCallable(fn: any) {
    return typeof fn === "function";
}

interface IteratorResult<T> {
    done: boolean;
    value: T;
}

interface Iterator<T> {
    next(value?: any): IteratorResult<T>;
    return?(value?: any): IteratorResult<T>;
    throw?(e?: any): IteratorResult<T>;
}

export interface Iterable<T> {
    [Symbol.iterator]: () => Iterator<T>;
}

export abstract class IteratorAbstract<T> implements Iterator<T> {
    _flag: Flag;
    _currentEntry: any;
    _done = false;
    constructor(flag: Flag) {
        this._flag = flag;
        this._currentEntry = null;
    }
    [Symbol.iterator]() {
        return this;
    }
    abstract next(): IteratorResult<T>;
}

Object.defineProperty(IteratorAbstract.prototype, Symbol.iterator.toString(), {
    // tslint:disable-next-line:object-literal-shorthand
    value: function() {
        return this;
    },
    writable: true,
    configurable: true
});

// Returns hash for primitive typed key like this:
// undefined or null => I___toString(key)
// number => N___toString(key)
// string => S___toString(key)
// boolean => B___toString(key)
//
// But returns null for object typed key.
export function hash(key: any): string {
    // String(0) === String(-0)
    // String(NaN) === String(NaN)
    const strKey = String(key);
    if (key === undefined || key === null) {
        return "I___" + strKey;
    }
    else if (typeof key === "number") {
        return "N___" + strKey;
    }
    else if (typeof key === "string") {
        return "S___" + strKey;
    }
    else if (typeof key === "boolean") {
        return "B___" + strKey;
    }
    return null; // For object key
}

interface PrimitiveStorageInterface<E> {
    [ key: number ]: E;
    [ key: string ]: E;
}

@Undoable()
class ObjectStorage<E> extends Array<E> {
    constructor(...args: any[]) {
        super(...args);
    }
}

export interface Storage<E> {
    primitives: PrimitiveStorageInterface<E>;
    objects: ObjectStorage<E>;
}

@Undoable()
class PrimitivesStorage<E> extends null {
    [ key: number ]: E;
    [ key: string ]: E;
    constructor() {
        return Object.create(null);
    }
}
// to make jest happy (this used without calling super while extending null)
@Undoable(["primitives", "objects"])
export class InternalStorage<E> extends null {
    primitives: PrimitiveStorageInterface<E>;
    objects: ObjectStorage<E>;
    constructor() {
        return Object.defineProperties(Object.create(null), {
            primitives: {
                value: new PrimitivesStorage<E>()
            },
            objects: {
                value: new ObjectStorage<E>()
            }
        });
    }
}
