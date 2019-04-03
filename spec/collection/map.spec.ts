import { Map } from "../../src/collection/map";


describe("map", () => {
    class CustomMap<K, V> extends Map<K, V> {}

    class Obj {
        constructor(public a: number) {}
    }
    function testMap<M extends Map<any, any>>(ctor: new (...args: any[]) => M) {
        function mapTest<K>(initialization: [K, number][]) {
            describe("", () => {
                // tslint:disable-next-line:variable-name
                let initialization_: [K, number][];
                let m: M;
                beforeEach(() => {
                    m = new ctor();
                    initialization_ = initialization.slice(0);
                    for (const it of initialization) {
                        m.set(it[0], it[1]);
                    }
                });

                test("constructor", () => {
                    const m = new ctor(initialization);
                    for (const it of initialization) {
                        expect(m.has(it[0])).toBe(true);
                        expect(m.get(it[0])).toEqual(it[1]);
                    }
                    expect(m.size).toBe(initialization.length);
                });

                test("clear", () => {
                    m.clear();
                    expect(m.size).toBe(0);
                });

                test("iterate", () => {
                    for (const it of m) {
                        expect(m.has(it[0])).toBe(true);
                        expect(m.get(it[0])).toEqual(it[1]);
                    }
                });

                test("iterate pair", () => {
                    for (const [k, v] of m) {
                        expect(m.has(k)).toBe(true);
                        expect(m.get(k)).toEqual(v);
                    }
                });

                test("delete", () => {
                    const elt = initialization_.pop();
                    m.delete(elt[0]);
                    expect(Array.from(m.entries())).toEqual(initialization_);
                });

                test("forEach", () => {
                    m.forEach((v, k) => {
                        expect(m.get(k)).toEqual(v);
                    });
                });

                test("get", () => {
                    expect(m.get(initialization_[0][0])).toEqual(
                        initialization_[0][1]
                    );
                    expect(m.get(initialization_[1][0])).toEqual(
                        initialization_[1][1]
                    );
                    expect(m.get("not a key")).toBeUndefined();
                });

                test("has", () => {
                    expect(m.has(initialization_[0][0])).toBe(true);
                    m.delete(initialization_[0][0]);
                    expect(m.has(initialization_[0][0])).toBe(false);
                    expect(m.has("key4")).toBe(false);
                });

                test("keys", () => {
                    expect(Array.from(m.keys())).toEqual(
                        initialization_.map(([k, v]) => k)
                    );
                });

                test("set", () => {
                    m.set(initialization_[0][0], 2);
                    m.set("key4", 4);
                    expect(m.get(initialization_[0][0])).toEqual(2);
                    expect(m.get("key4")).toEqual(4);
                });

                test("values", () => {
                    expect(Array.from(m.values())).toEqual(
                        initialization_.map(([k, v]) => v)
                    );
                });
            });
        }
        mapTest<string>([["key1", 1], ["key2", 2], ["key3", 3]]);
        mapTest<Number>([[1, 1], [2, 2], [3, 3]]);
        mapTest<boolean>([[true, 1], [false, 0]]);

        mapTest<Obj>([[new Obj(1), 1], [new Obj(2), 2], [new Obj(3), 3]]);
        mapTest<Obj>([[new Obj(1), 1], [new Obj(1), 2], [new Obj(1), 3]]);

    }

    testMap<Map<any, any>>(Map);
    testMap<CustomMap<any, any>>(CustomMap);
});
