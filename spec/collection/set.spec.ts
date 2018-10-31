import { Set } from "../../src/collection/set";

class CustomSet<K> extends Set<K> {}

class Obj {
    constructor(public a: number) {}
}

describe("map", () => {
    function testSet<M extends Set<any>>(ctor: new (...args: any[]) => M) {
        let m: M;
        beforeEach(() => {
            m = new ctor();
        });

        function mapTest<K>(initialization: K[]) {
            describe("", () => {
                // tslint:disable-next-line:variable-name
                let initialization_: K[];
                beforeEach(() => {
                    initialization_ = initialization.slice(0);
                    for (const it of initialization) {
                        m.add(it);
                    }
                });

                test("constructor", () => {
                    const m = new ctor(initialization);
                    for (const it of initialization) {
                        expect(m.has(it)).toBe(true);
                    }
                    expect(m.size).toBe(initialization.length);
                });

                test("clear", () => {
                    m.clear();
                    expect(m.size).toBe(0);
                });

                test("iterate", () => {
                    for (const it of m) {
                        expect(m.has(it)).toBe(true);
                    }
                });

                test("delete", () => {
                    const elt = initialization_.pop();
                    m.delete(elt);
                    expect(Array.from(m.entries())).toEqual(initialization_.map((k) => [k, k]));
                });

                test("forEach", () => {
                    m.forEach((v, k) => {
                        expect(m.has(k)).toBe(true);
                    });
                });

                test("get", () => {
                    expect(m.has(initialization_[0])).toBe(true);
                    expect(m.has(initialization_[1])).toBe(true);
                    expect(m.has("not a key")).toBe(false);
                });

                test("has", () => {
                    expect(m.has(initialization_[0])).toBe(true);
                    m.delete(initialization_[0]);
                    expect(m.has(initialization_[0])).toBe(false);
                    expect(m.has("key4")).toBe(false);
                });

                test("keys", () => {
                    expect(Array.from(m.keys())).toEqual(initialization_);
                });

                test("set", () => {
                    m.add(initialization_[0]);
                    m.add("key4");
                    expect(m.has(initialization_[0])).toBe(true);
                    expect(m.has("key4")).toBe(true);
                });

                test("values", () => {
                    expect(Array.from(m.values())).toEqual(initialization_);
                });
            });
        }
        mapTest<string>(["key1", "key2", "key3"]);
        mapTest<Number>([1, 2, 3]);
        mapTest<boolean>([true, false]);

        mapTest<Obj>([new Obj(1), new Obj(2), new Obj(3)]);
    }

    testSet<Set<any>>(Set);
    testSet<CustomSet<any>>(CustomSet);
});
