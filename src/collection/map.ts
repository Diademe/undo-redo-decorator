"use strict";
import { IteratorAbstract, Flag, Storage, isObject, hash, isCallable, InternalStorage } from "./utils";
import { Undoable } from "../decorator";

// tslint:disable:no-null-keyword

class MapIterator<K, V, R = K | V | [K, V]> extends IteratorAbstract<R> {
    _map: Map<K, V>;
    constructor(map: Map<K, V>, flag: Flag) {
        super(flag);
        this._map = map;
    }

    next(): IteratorResult<R> {
        if (!(this instanceof MapIterator)) {
            throw new TypeError(
                "Method Map Iterator.prototype.next called on incompatible receiver " +
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
            this._currentEntry = this._map._head;
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
        if (this._flag === Flag.KeyValue) {
            nextValue = [this._currentEntry.key, this._currentEntry.value];
        }
        else if (this._flag === Flag.Value) {
            nextValue = this._currentEntry.value;
        }
        else if (this._flag === Flag.Key) {
            nextValue = this._currentEntry.key;
        }
        return {
            done: false,
            value: nextValue
        };
    }
}

Object.defineProperty(MapIterator.prototype, Symbol.toStringTag, {
    value: "Map Iterator",
    configurable: true
});

@Undoable()
class MapEntry<K, V> {
    next: MapEntry<K, V>;
    prev: MapEntry<K, V>;
    constructor(public key: K, public value: V) {
        this.next = null;
        this.prev = null;
    }
}

@Undoable(["_data", "_size", "_head", "_tail"])
export class Map<K, V> {
    _head: MapEntry<K, V>;
    _tail: MapEntry<K, V>;
    _objectHash: symbol;
    _isMap: boolean;
    _size: number;
    _data: Storage<MapEntry<K, V>>;
    constructor(iterable?: Iterable<[K, V]>) {
        Object.defineProperties(this, {
            _isMap: {
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
                value: Symbol("Hash(map)")
            },
            _size: {
                value: 0,
                writable: true
            },
            _data: {
                value: new InternalStorage<MapEntry<K, V>>()
            }
        });
        if (iterable) {
            for (const it of iterable) {
                if (!isObject(it)) {
                    throw new TypeError("Iterator value " + it + " is not an entry object")
                }
                this.set(it[0], it[1]);
            }
        }
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    set(key: K, value: V): this {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.set called on incompatible receiver " + this);
        }
        const keyHash = hash(key),
            objectHash = this._objectHash;
        let entry: MapEntry<K, V>;
        if (keyHash === null) { // object key
            const t = this._data.objects[1]
            // key already exists
            if (typeof (key as any)[objectHash] === "number" && this._data.objects[(key as any)[objectHash]] instanceof MapEntry) {
                entry = this._data.objects[(key as any)[objectHash]];
                entry.value = value;
                return this;
            }
            // key doesn't exist
            entry = new MapEntry(key, value);
            this._data.objects.push(entry);
            Object.defineProperty(key, objectHash, {
                value: this._data.objects.length - 1,
                configurable: true
            });
            this._size++;
        }
        else {
            if (this._data.primitives[keyHash] instanceof MapEntry) {
                entry = this._data.primitives[keyHash];
                entry.value = value;
                return this;
            }
            entry = new MapEntry(key, value);
            this._data.primitives[keyHash] = entry;
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

    has(key: K) {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.has called on incompatible receiver " + this);
        }
        const keyHash = hash(key),
            objectHash = this._objectHash;

        if (keyHash === null) { // key is an object
            return typeof (key as any)[objectHash] === "number" && this._data.objects[(key as any)[objectHash]] instanceof MapEntry;
        }
        else {
            return this._data.primitives[keyHash] instanceof MapEntry;
        }
    }

    get(key: K): V {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.get called on incompatible receiver " + this);
        }
        const keyHash = hash(key),
            objectHash = this._objectHash;
        if (keyHash === null) {
            if (typeof (key as any)[objectHash] === "number" && this._data.objects[(key as any)[objectHash]] instanceof MapEntry) {
                return this._data.objects[(key as any)[objectHash]].value;
            }
        }
        else {
            if (this._data.primitives[keyHash] instanceof MapEntry) {
                return this._data.primitives[keyHash].value;
            }
        }
        return undefined;
    }

    clear(): void {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.clear called on incompatible receiver " + this);
        }
        let entry: any;
        // Clear all primitive keys
        Object.getOwnPropertyNames(this._data.primitives).forEach(function (prop) {
            if (this._data.primitives[prop] instanceof MapEntry) {
                entry = this._data.primitives[prop];
                delete this._data.primitives[prop];
                entry.next = null;
                entry.prev = null;
            }
        }, this);

        // Clear all object keys
        Object.getOwnPropertyNames(this._data.objects).forEach(function (prop) {
            if (this._data.objects[prop] instanceof MapEntry) {
                entry = this._data.objects[prop];
                delete this._data.objects[prop];
                delete entry.key[this._objectHash];
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

    delete(key: K): boolean {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.delete called on incompatible receiver " + this);
        }
        const keyHash = hash(key),
            objectHash = this._objectHash;
        let entry: any;
        if (keyHash === null) {
            if (typeof (key as any)[objectHash] === "number" && this._data.objects[(key as any)[objectHash]] instanceof MapEntry) {
                entry = this._data.objects[(key as any)[objectHash]];
                delete this._data.objects[(key as any)[objectHash]];
                delete entry.key[objectHash];
            }
            else {
                return false;
            }
        }
        else {
            if (this._data.primitives[keyHash] instanceof MapEntry) {
                entry = this._data.primitives[keyHash];
                delete this._data.primitives[keyHash];
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

    entries(): MapIterator<K, V, [K, V]> {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.entries called on incompatible receiver " + this);
        }
        return new MapIterator(this, Flag.KeyValue);
    }

    values(): MapIterator<K, V, V> {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.values called on incompatible receiver " + this);
        }
        return new MapIterator(this, Flag.Value);
    }

    keys(): MapIterator<K, V, K> {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.keys called on incompatible receiver " + this);
        }
        return new MapIterator(this, Flag.Key);
    }

    forEach(callback: (key: K, value: V, thisArg: any) => any, thisArg?: any): void {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.forEach called on incompatible receiver " + this);
        }
        if (!isCallable(callback)) {
            throw new TypeError(callback + " is not a function");
        }
        let currentEntry = this._head;
        while (currentEntry !== null) {
            callback.call(thisArg, currentEntry.value, currentEntry.key, this);
            currentEntry = currentEntry.next;
        }
    }

    get size() {
        return this._size;
    }
}

Object.defineProperty(Map.prototype, Symbol.toStringTag.toString(), {
    value: "Map",
    configurable: true
});

Object.defineProperty(Map.prototype, "size", {
    get: function size() {
        if (!(this instanceof Map)) {
            throw new TypeError("Method Map.prototype.size called on incompatible receiver " + this);
        }
        return this._size;
    },
    configurable: true
});
