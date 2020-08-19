// import { Map } from "../src/collection/map";
// import { Set } from "../src/collection/set";
import { Undoable, UndoRedo } from "../src";

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

@Undoable(["length"])
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

describe("immutable", () => {
    describe("collections", () => {
        describe("CustomSet", () => {
            let x: CustomSet<number>;
            let ud: UndoRedo;
            beforeEach(() => {
                x = new CustomSet([1, 2, 3]);
                ud = new UndoRedo(x);
            });
            test("add", () => {
                expect(Array.from(x.values())).toEqual([1, 2, 3]);
                x.add(4);
                expect(Array.from(x.values())).toEqual([1, 2, 3, 4]);
                ud.save();
                ud.undo();
                expect(Array.from(x.values())).toEqual([1, 2, 3]);
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
                ud.save();
                ud.undo();
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"], [3, "3"]]);
            });
            test("entries", () => {
                x = new CustomMap([]);
                ud = new UndoRedo(x);
                expect(Array.from(x.entries())).toEqual([]);
                x.set(1, "1");
                ud.save();
                expect(Array.from(x.entries())).toEqual([[1, "1"]]);
                x.set(2, "2");
                ud.save();
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"]]);
                ud.undo();
                expect(Array.from(x.entries())).toEqual([[1, "1"]]);
                ud.save();
                ud.redo();
                expect(Array.from(x.entries())).toEqual([[1, "1"], [2, "2"]]);
            });
        });

        describe("CustomArray", () => {
            let x: CustomArray;
            let ud: UndoRedo;
            beforeEach(() => {
                x = new CustomArray([1, 2, 3]);
                ud = new UndoRedo(x);
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
            test("length 1", () => {
                ud.undo(0);
                x.length = 0;
                ud.save();
                expect(x.length).toEqual(0);
                expect(ud.getCurrentIndex()).toEqual(1);

                x.push(42);
                ud.save();
                expect(x.length).toEqual(1);
                expect(ud.getCurrentIndex()).toEqual(2);

                ud.undo();
                expect(x.length).toEqual(0);

                x.push(43);
                ud.save();
                expect(x.length).toEqual(1);
                expect(ud.getCurrentIndex()).toEqual(2);

            });
            test("length 2", () => {
                x = new CustomArray([]);
                ud = new UndoRedo(x);
                expect(x.length).toEqual(0);
                expect(ud.getCurrentIndex()).toEqual(0);

                x.push(1);
                ud.save();
                expect(x.length).toEqual(1);
                expect(Array.from(x)).toEqual([1]);
                expect(ud.getCurrentIndex()).toEqual(1);

                ud.undo();
                expect(x.length).toEqual(0);
                expect(Array.from(x)).toEqual([]);
                expect(ud.getCurrentIndex()).toEqual(0);

                ud.redo();
                expect(x.length).toEqual(1);
                expect(Array.from(x)).toEqual([1]);
                expect(ud.getCurrentIndex()).toEqual(1);
            });
            test("length 3", () => {
                expect(x.length).toEqual(3);
                x.pop();
                expect(x.length).toEqual(2);
                ud.save();
                ud.save();
                ud.save();
                expect(x.length).toEqual(2);

                ud.undo();
                expect(x.length).toEqual(3);
            });
            test("reduce", () => {
                function add(v: number, acc: number) {
                    return v + acc;
                }
                expect(x.reduce(add, 0)).toEqual(6);
            });
            test("sort", () => {
                expect(x.reverse()).toEqual(CustomArray.from([3, 2, 1])); // in place
                expect(x.sort()).toEqual(CustomArray.from([1, 2, 3])); // in place
            });
            test("splice", () => {
                x.splice(1, 1);
                expect(x).toEqual(CustomArray.from([1, 3])); // in place
            });
            test("shift", () => {
                x.shift();
                expect(x).toEqual(CustomArray.from([2, 3])); // in place
            });
            test("[Symbol​.iterator]()", () => {
                expect(Array.from(x[Symbol​.iterator]())).toEqual([1, 2, 3]);
            });
        });
    });
});
