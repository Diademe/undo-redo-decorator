"use strict";
import { IteratorAbstract, Flag, Storage, hash, isCallable, InternalStorage } from "./utils";
import { Undoable } from "../decorator";

// tslint:disable:no-null-keyword

@Undoable()
class SetIterator<T> extends IteratorAbstract<T> {
    _set: Set<T>;
    constructor(set: Set<T>, flag: Flag) {
        super(flag);
        this._set = set;
    }
    next(): IteratorResult<R> {
        if (!(this instanceof SetIterator)) {
            throw new TypeError(
                "Method Set Iterator.prototype.next called on incompatible receiver " +
                    String(this)
            );
        }
        let nextValue;
        if (this._done) {
            return {
                done: true,
                value: undefined
            };
        }
        if (this._currentEntry === null) {
            this._currentEntry = this._set._head;
        }
        else {
            this._currentEntry = this._currentEntry.next;
        }

        if (this._currentEntry === null) {
            this._done = true;
            return {
                done: true,
                value: undefined
            };
        }
        switch (this._flag) {
            case Flag.KeyValue:
                nextValue = [this._currentEntry.value, this._currentEntry.value];
                break;
            case Flag.Value:
            case Flag.Key:
                nextValue = this._currentEntry.value;
                break;
        }
        return {
            done: false,
            value: nextValue
        };
    }
}

Object.defineProperty(SetIterator.prototype, Symbol.toStringTag, {
    value: "Set Iterator",
    configurable: true
});

@Undoable()
class SetEntry<K> {
    next: SetEntry<K>;
    prev: SetEntry<K>;
    constructor(public value: K) {
        this.next = null;
        this.prev = null;
    }
}

@Undoable(["_data", "_size", "_head", "_tail"])
export class Set<K> {
    _head: SetEntry<K>;
    _tail: SetEntry<K>;
    _objectHash: symbol;
    _data: Storage<SetEntry<K>>;
    _size: number;

    constructor(iterable?: Iterable<K>) {
        Object.defineProperties(this, {
            _isSet: {
                value: true
            },
            _head: {
                value: null,
                writable: true
            },
            _tail: {
                value: null,
                writable: true
            },
            _objectHash: {
                value: Symbol("Hash(set)")
            },
            _size: {
                value: 0,
                writable: true
            },
            _data: {
                value: new InternalStorage<SetEntry<K>>()
            }
        });
        if (iterable) {
            for (const it of iterable) {
                this.add(it);
            }
        }
    }

    add(value: K): this {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.add called on incompatible receiver " + this);
        }
        const valueHash = hash(value),
            objectHash = this._objectHash;
        let entry: SetEntry<K>;
        if (valueHash === null) { // value is an Object
            if (typeof (value as any)[objectHash] === "number" && this._data.objects[(value as any)[objectHash]] instanceof SetEntry) {
                // If the value is already present then just return 'this'
                return this;
            }
            entry = new SetEntry(value);
            this._data.objects.push(entry);
            Object.defineProperty(value, objectHash, {
                value: this._data.objects.length - 1,
                configurable: true
            });
            this._size++;
        }
        else {
            if (this._data.primitives[valueHash] instanceof SetEntry) {
                // If the value is already present then just return 'this'
                return this;
            }
            entry = new SetEntry(value);
            this._data.primitives[valueHash] = entry;
            this._size++;
        }

        if (this._head === null) {
            this._head = entry;
            entry.next = null;
            entry.prev = null;
        }
        if (this._tail === null) {
            this._tail = this._head;
        }
        else {
            this._tail.next = entry;
            entry.prev = this._tail;
            entry.next = null;
            this._tail = entry;
        }
        return this;
    }

    has(value: K): boolean {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.has called on incompatible receiver " + this);
        }
        const valueHash = hash(value),
            objectHash = this._objectHash;

        if (valueHash === null) {
            return typeof (value as any)[objectHash] === "number" && this._data.objects[(value as any)[objectHash]] instanceof SetEntry;
        }
        else {
            return this._data.primitives[valueHash] instanceof SetEntry;
        }
    }

    clear(): void {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.clear called on incompatible receiver " + this);
        }
        let entry: SetEntry<K>;
        // Clear all primitive values
        Object.getOwnPropertyNames(this._data.primitives).forEach(function (prop) {
            if (this._data.primitives[prop] instanceof SetEntry) {
                entry = this._data.primitives[prop];
                delete this._data.primitives[prop];
                entry.next = null;
                entry.prev = null;
            }
        }, this);

        // Clear all object values
        Object.getOwnPropertyNames(this._data.objects).forEach(function (prop) {
            if (this._data.objects[prop] instanceof SetEntry) {
                entry = this._data.objects[prop];
                delete this._data.objects[prop];
                delete (entry.value as any)[this._objectHash];
                entry.next = null;
                entry.prev = null;
            }
        }, this);
        this._data.objects.length = 0;

        // Free head and tail MapEntry
        this._head = null;
        this._tail = null;
        this._size = 0;
    }

    delete (value: K): boolean {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.delete called on incompatible receiver " + this);
        }
        const valueHash = hash(value),
            objectHash = this._objectHash;
        let entry: SetEntry<K>;
        if (valueHash === null) {
            if (typeof (value as any)[objectHash] === "number" && this._data.objects[(value as any)[objectHash]] instanceof SetEntry) {
                entry = this._data.objects[(value as any)[objectHash]];
                delete this._data.objects[(value as any)[objectHash]];
                delete (entry.value as any)[objectHash];
            }
            else {
                return false;
            }
        }
        else {
            if (this._data.primitives[valueHash] instanceof SetEntry) {
                entry = this._data.primitives[valueHash];
                delete this._data.primitives[valueHash];
            }
            else {
                return false;
            }
        }

        if (entry.prev !== null && entry.next !== null) {
            entry.prev.next = entry.next;
            entry.next.prev = entry.prev;
            entry.next = null;
            entry.prev = null;
        }
        else if (entry.prev === null && entry.next !== null) {
            this._head = entry.next;
            entry.next.prev = null;
            entry.next = null;
        }
        if (entry.prev !== null && entry.next === null) {
            this._tail = entry.prev;
            entry.prev.next = null;
            entry.prev = null;
        }
        else {
            this._head = null;
            this._tail = null;
        }
        this._size--;
        return true;
    }

    entries(): SetIterator<K> {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.entries called on incompatible receiver " + this);
        }
        return new SetIterator(this, Flag.KeyValue);
    }

    values(): SetIterator<K> {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.values called on incompatible receiver " + this);
        }
        return new SetIterator(this, Flag.Value);
    }

    keys(): SetIterator<K> {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.keys called on incompatible receiver " + this);
        }
        return new SetIterator(this, Flag.Key);
    }

    [Symbol.iterator](): SetIterator<K> {
        return this.keys();
    }

    forEach(callback: (value1: K, value2: K, thisArg: any) => any, thisArg?: any) {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.forEach called on incompatible receiver " + this);
        }
        if (!isCallable(callback)) {
            throw new TypeError(callback + " is not a function");
        }
        let currentEntry = this._head;
        while (currentEntry !== null) {
            callback.call(thisArg, currentEntry.value, currentEntry.value, this);
            currentEntry = currentEntry.next;
        }
    }

    get size() {
        return this._size;
    }
}

Object.defineProperty(Set.prototype, Symbol.toStringTag, {
    value: "Set",
    configurable: true
});

Object.defineProperty(Set.prototype, "size", {
    get: function size() {
        if (!(this instanceof Set)) {
            throw new TypeError("Method Set.prototype.size called on incompatible receiver " + this);
        }
        return this._size;
    },
    configurable: true
});
