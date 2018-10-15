import { immutable, Undoable } from "../src/index";

@Undoable
class CustomMap extends Map {
    constructor(args?: any[]) {
        super();
        if (args) {
            for (const [k, v] of args) {
                this.set(k, v);
            }
        }

    }
}

@Undoable
class CustomSet extends Set {
    constructor(args?: any[]) {
        super();
        if (args) {
            for (const k of args) {
                this.add(k);
            }
        }
    }
}

function isIterable(obj: any) {
    if (obj === null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === "function";
}

@Undoable
class CustomArray extends Array {
    constructor(args?: any[]) {
        super();
        if (args) {
            if (isIterable(args)) {
                for (const v of args) {
                    this.push(v);
                }
            }
            else {
                this.push(args);
            }
        }
    }
}

@Undoable
class CustomDate extends Date {
    constructor(args: string | number) {
        super(args);
    }
}

describe("immutable", () => {
    describe("collections", () => {
        describe("CustomSet", () => {
            let x: CustomSet;
            beforeEach(() => {
                x = new CustomSet([1, 2, 3]);
            });
            test("Set", () => {
                expect(x.has(1)).toBe(true);
                expect(x.has(4)).toBe(false);
                x.add(4);
                expect(x.has(4)).toBe(true);
                x.delete(4);
                expect(x.has(4)).toBe(false);
                x.forEach((val1, val2) => expect(val1).toBe(val2));
                expect(Array.from(x.values())).toEqual([1, 2, 3]);
                expect(Array.from(x.keys())).toEqual([1, 2, 3]);
                expect(Array.from(x.entries())).toEqual([[1, 1], [2, 2], [3, 3]]);
                for (const k of x) {
                    expect(k).toBe(k);
                }
                x.clear();
                expect(Array.from(x.entries())).toEqual([]);
            });
        });

        describe("CustomMap", () => {
            let x: CustomMap;
            beforeAll(() => {
                x = new CustomMap([[1, "1"], [2, "2"], [3, "3"]]);
            });
            test("Map", () => {
                expect(x.has(1)).toBe(true);
                expect(x.has(4)).toBe(false);
                x.set(4, "4");
                expect(x.has(4)).toBe(true);
                x.delete(4);
                expect(x.get(4)).toBeUndefined();
                expect(x.get(1)).toBe("1");
                expect(Array.from(x.values())).toEqual(["1", "2", "3"]);
                expect(Array.from(x.keys())).toEqual([1, 2, 3]);
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"], [3, "3"]]);
                x.forEach((value, key) => expect(value).toBe(key.toString()));
                for (const [k, v] of x) {
                    expect(k.toString()).toBe(v);
                }
                x.clear();
                expect(Array.from(x.entries())).toEqual([]);
            });
        });

        describe("CustomArray", () => {
            let x: CustomArray;
            beforeEach(() => {
                x = new CustomArray([1, 2, 3]);
            });
            test("instanceof", () => {
                expect(CustomArray.from([1, 2, 3])).toBeInstanceOf(CustomArray);
            });
            test("entries", () => {
                for (const [i, v] of x.entries()) {
                    expect(i + 1).toBe(v);
                }
            });
            test("concat", () => {
                expect(x.concat([4, 5])).toEqual([1, 2, 3, 4, 5]);
            });
            test("every", () => {
                expect(x.every((v) => v > 0)).toBe(true);
                expect(x.every((v) => v < 2)).toBe(false);
            });
            test("fill", () => {
                expect(x.fill(0, 2, 4)).toEqual([1, 2, 0]);
            });
            test("filter", () => {
                expect(x.filter((v) => v % 2)).toEqual([1, 3]);
            });
            test("find", () => {
                expect(x.find((v) => v % 2 !== 0)).toEqual(1);
                expect(x.find((v) => v < 0)).toBeUndefined();
            });
            test("findIndex", () => {
                expect(x.findIndex((v) => v % 2 !== 0)).toEqual(0);
                expect(x.findIndex((v) => v < 0)).toEqual(-1);
            });
            test("forEach", () => {
                x.forEach((e, i) => {
                    expect(e - 1).toBe(i);
                });
            });
            test("indexOf", () => {
                expect(x.indexOf(1)).toEqual(0);
                expect(x.indexOf(0)).toEqual(-1);
            });
            test("join", () => {
                expect(x.join(", ")).toEqual("1, 2, 3");
            });
            test("keys", () => {
                expect(Array.from(x.keys())).toEqual([0, 1, 2]);
            });
            test("map", () => {
                expect(x.map((e) => e * 2)).toEqual([2, 4, 6]);
            });
            test("pop", () => {
                expect(x.pop()).toEqual(3);
            });
            test("push", () => {
                function add(v: number, acc: number) {
                    return v + acc;
                }
                expect(x.reduce(add, 0)).toEqual(6);
            });
            test("sort", () => {
                expect(x.reverse()).toEqual([3, 2, 1]); // in place
                expect(x.sort()).toEqual([1, 2, 3]); // in place
            });

        });

        test("CustomDate", () => {
            const x = new CustomDate("December 17, 1995 03:24:00");
            expect(x.getDate()).toBe(17);
            expect(x.getDay()).toBe(0);
            expect(x.getHours()).toBe(3);
            expect(x.toUTCString()).toBe("Sun, 17 Dec 1995 02:24:00 GMT");
            expect(x[Symbol.toPrimitive]("string")).toBe("Sun Dec 17 1995 03:24:00 GMT+0100 (Romance Standard Time)");
            expect(x.valueOf()).toBe(819167040000);
        });
    });

    describe("clone collections", () => {
        type Collection<K, V> = Set<K> | Map<K, V>;
        function collection<K, V>(
            title: string,
            ctor: new (...args: any[]) => Collection<K, V>,
            clone: (arg: Collection<K, V>) => Collection<K, V>,
            args: any) {
            test(title, () => {
                const collOriginal = new ctor(args);
                const collCloned = clone(collOriginal);
                expect(collCloned.constructor).toBe(ctor);
                expect(collOriginal).not.toBe(collCloned);
                expect(collOriginal.size).toBe(collCloned.size);
                console.log(collCloned.entries());

                expect(collOriginal.keys()).toEqual(collCloned.keys());
                expect(collOriginal.values()).toEqual(collCloned.values());
                expect(collOriginal.entries()).toEqual(collCloned.entries());
            });
        }
        collection("ES6 Set", Set, immutable.set, [1, 2, 3]);
        collection("custom Set", CustomSet, immutable.set, [1, 2, 3]);
        collection("ES6 Map", Map, immutable.map, [[1, "1"], [2, "2"], [3, "3"]]);
        collection("custom Map", CustomMap, immutable.map, [[1, "1"], [2, "2"], [3, "3"]]);


    });


});