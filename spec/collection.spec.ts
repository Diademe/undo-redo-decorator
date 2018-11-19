import { Map } from "../src/collection/map";
import { Set } from "../src/collection/set";
import { Undoable, UndoRedo, UndoableNoParent } from "../src";

@Undoable()
class CustomMap<K, V> extends Map<K, V> {
    constructor(args?: any[]) {
        super(args);
        if (args) {
            for (const [k, v] of args) {
                this.set(k, v);
            }
        }
    }
}

@Undoable()
class CustomSet<K> extends Set<K> {
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

@UndoableNoParent()
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

@Undoable()
class CustomDate extends Date {
    constructor(args: string | number) {
        super(args);
    }
}

describe("immutable", () => {
    describe("collections", () => {
        describe("CustomSet", () => {
            let x: CustomSet<number>;
            let ud: UndoRedo;
            beforeEach(() => {
                x = new CustomSet([1, 2, 3]);
                ud = new UndoRedo(x);
            });
            test("Set", () => {
                x.add(4);
                expect(Array.from(x.values())).toEqual([1, 2, 3, 4])
            });
        });

        describe("CustomMap", () => {
            let x: CustomMap<number, string>;
            let ud: UndoRedo;

            beforeEach(() => {
                x = new CustomMap([[1, "1"], [2, "2"], [3, "3"]]);
                ud = new UndoRedo(x);
            });
            test("get", () => {
                expect(x.get(1)).toBe("1");
            });
            test("has", () => {
                expect(x.has(1)).toBe(true);
            });
            test("set", () => {
                expect(Array.from(x.set(4, "4").entries())).toEqual([[1, "1"], [2, "2"], [3, "3"], [4, "4"]]);
            });
            test("iterator", () => {
                for (const [k, v] of x) {
                    expect(k.toString()).toBe(v);
                }
            });
            test("delete", () => {
                x.delete(3);
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"]]);
            });
            test("undoable", () => {
                x.delete(3);
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"]]);
                ud.undo();
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"], [3, "3"]]);
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
                const res = x.concat([4, 5]);
                const expected = CustomArray.from([1, 2, 3, 4, 5]);
                expect(res).toEqual(
                    expected
                );
            });
            test("every", () => {
                expect(x.every(v => v > 0)).toBe(true);
                expect(x.every(v => v < 2)).toBe(false);
            });
            test("fill", () => {
                expect(x.fill(0, 2, 4)).toEqual(CustomArray.from([1, 2, 0]));
            });
            test("filter", () => {
                expect(x.filter(v => v % 2)).toEqual(CustomArray.from([1, 3]));
            });
            test("find", () => {
                expect(x.find(v => v % 2 !== 0)).toEqual(1);
                expect(x.find(v => v < 0)).toBeUndefined();
            });
            test("findIndex", () => {
                expect(x.findIndex(v => v % 2 !== 0)).toEqual(0);
                expect(x.findIndex(v => v < 0)).toEqual(-1);
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
                expect(x.map(e => e * 2)).toEqual(CustomArray.from([2, 4, 6]));
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
                expect(x.reverse()).toEqual(CustomArray.from([3, 2, 1])); // in place
                expect(x.sort()).toEqual(CustomArray.from([1, 2, 3])); // in place
            });
            test("[Symbol​.iterator]()", () => {
                expect(Array.from(x[Symbol​.iterator]())).toEqual([1, 2, 3]);
            });
        });

        test("CustomDate", () => {
            const x = new CustomDate("December 17, 1995 03:24:00");
            expect(x.getDate()).toBe(17);
            expect(x.getDay()).toBe(0);
            expect(x.getHours()).toBe(3);
            expect(x.toUTCString()).toBe("Sun, 17 Dec 1995 02:24:00 GMT");
            expect(x[Symbol.toPrimitive]("string")).toBe(
                "Sun Dec 17 1995 03:24:00 GMT+0100 (Central European Standard Time)"
            );
            expect(x.valueOf()).toBe(819167040000);
        });
    });
});
