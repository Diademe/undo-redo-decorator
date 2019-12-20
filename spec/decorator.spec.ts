import { Undoable, UndoDoNotTrack, UndoRedo } from "../src/index";
import { is_constructor } from "./utils";
import { UndoAfterLoad, UndoDoNotRecurs } from "../src/decorator";

describe("decorator", () => {
    const db = new Set<any>();
    function save<T extends Object, K extends keyof T>(
        target: T,
        keyName: K,
        _: any
    ) {
        const res = is_constructor(target);
        db.add(res ? target : target.constructor);
    }
    function saveClass<T extends Object>(target: T) {
        db.add(target);
    }

    @saveClass
    @Undoable()
    class Foo {
        constructor(public name: string) {}

        @save
        clone() {
            return new Foo("clone of " + this.name);
        }
    }

    let foo: Foo;

    beforeEach(() => {
        foo = new Foo("foo");
    });

    test("nonEnumerable", () => {
        @Undoable(["A"])
        class A {}
        @Undoable(["B"])
        class B extends A {}
        @Undoable(["C"])
        class C extends B {}
        @Undoable(["D"])
        class D extends A {}
        expect(((new A()) as any).constructor.prototype.__undoInternalInformation__.nonEnumerables).toEqual(["A"]);
        expect(((new B()) as any).constructor.prototype.__undoInternalInformation__.nonEnumerables).toEqual(["A", "B"]);
        expect(((new C()) as any).constructor.prototype.__undoInternalInformation__.nonEnumerables).toEqual(["A", "B", "C"]);
        expect(((new D()) as any).constructor.prototype.__undoInternalInformation__.nonEnumerables).toEqual(["A", "D"]);
    });

    describe("After Load", () => {
        test("no inheritance", () => {
            @Undoable()
            class Test {
                prop = 1;
                @UndoAfterLoad
                after() {
                    this.prop = 2;
                }
            }
            const test = new Test();
            const ud = new UndoRedo(test);
            expect(test.prop).toBe(1);
            test.prop = 3;
            ud.save();
            expect(test.prop).toBe(3);
            ud.undo();
            expect(test.prop).toBe(2);
        });

        test("inheritance", () => {
            @Undoable()
            class MotherTest {
                prop = 1;
                @UndoAfterLoad
                after() {
                    this.prop = 2;
                }
            }
            @Undoable()
            class Test extends MotherTest {
            }
            const test = new Test();
            const ud = new UndoRedo(test);
            expect(test.prop).toBe(1);
            test.prop = 3;
            ud.save();
            expect(test.prop).toBe(3);
            ud.undo();
            expect(test.prop).toBe(2);
        });
    });

    describe("Do not track", () => {
        test("inheritance", () => {
            class MotherTest {
                @UndoDoNotTrack
                motherDNT: Number;
                constructor() {
                    this.motherDNT = 42;
                }
            }
            @Undoable()
            class ChildTest extends MotherTest {
                @UndoDoNotTrack
                childDNT: Number;
                childDoTrack: Number;
                constructor() {
                    super();
                    this.childDNT = 43;
                    this.childDoTrack = 18
                }
            }
            const childTest = new ChildTest();
            const ud = new UndoRedo(childTest);
            expect(childTest.motherDNT).toEqual(42);
            expect(childTest.childDNT).toEqual(43);
            expect(childTest.childDoTrack).toEqual(18);
            childTest.motherDNT = 15;
            childTest.childDNT = 44;
            childTest.childDoTrack = 19;
            ud.save();
            expect(childTest.motherDNT).toEqual(15);
            expect(childTest.childDNT).toEqual(44);
            expect(childTest.childDoTrack).toEqual(19);
            ud.undo();
            expect(childTest.motherDNT).toEqual(15);
            expect(childTest.childDNT).toEqual(44);
            expect(childTest.childDoTrack).toEqual(18);
        });

        test("test 1", () => {
            @Undoable()
            class MotherTest {
                @UndoDoNotTrack
                motherDNT: Number;
                constructor() {
                    this.motherDNT = 42;
                }
            }
            @Undoable()
            class ChildTest extends MotherTest {
                @UndoDoNotTrack
                childDNT: Number;
                childDoTrack: Number;
                constructor() {
                    super();
                    this.childDNT = 43;
                    this.childDoTrack = 18
                }
            }
            const childTest = new ChildTest();
            const ud = new UndoRedo(childTest);
            expect(childTest.motherDNT).toEqual(42);
            expect(childTest.childDNT).toEqual(43);
            expect(childTest.childDoTrack).toEqual(18);
            childTest.motherDNT = 15;
            childTest.childDNT = 44;
            childTest.childDoTrack = 19;
            ud.save();
            expect(childTest.motherDNT).toEqual(15);
            expect(childTest.childDNT).toEqual(44);
            expect(childTest.childDoTrack).toEqual(19);
            ud.undo();
            expect(childTest.motherDNT).toEqual(15);
            expect(childTest.childDNT).toEqual(44);
            expect(childTest.childDoTrack).toEqual(18);
        });

        test("test 2", () => {
            @Undoable()
            class MotherTest {
                @UndoDoNotTrack
                motherDNT: Number;
                constructor() {
                    this.motherDNT = 42;
                }
            }
            @Undoable()
            class ChildTest extends MotherTest {}
            const childTest = new ChildTest();
            const ud = new UndoRedo(childTest);
            expect(childTest.motherDNT).toEqual(42);
            childTest.motherDNT = 15;
            ud.save();
            expect(childTest.motherDNT).toEqual(15);
            ud.undo();
            expect(childTest.motherDNT).toEqual(15);
        });
    });

    describe("Do not recurs", () => {
        test("inheritance", () => {
            @Undoable()
            class T {
                constructor(public n: number) {}
            }
            class MotherTest {
                @UndoDoNotRecurs
                motherDNT: T;
                constructor() {
                    this.motherDNT = new T(42);
                }
            }
            @Undoable()
            class ChildTest extends MotherTest {
                @UndoDoNotRecurs
                childDNT: T;
                childDoTrack: T;
                constructor() {
                    super();
                    this.childDNT = new T(43);
                    this.childDoTrack = new T(18);
                }
            }
            const childTest = new ChildTest();
            const ud = new UndoRedo(childTest);
            expect(childTest.motherDNT.n).toEqual(42);
            expect(childTest.childDNT.n).toEqual(43);
            expect(childTest.childDoTrack.n).toEqual(18);
            childTest.motherDNT.n = 15;
            childTest.childDNT.n = 44;
            childTest.childDoTrack.n = 19;
            ud.save();
            expect(childTest.motherDNT.n).toEqual(15);
            expect(childTest.childDNT.n).toEqual(44);
            expect(childTest.childDoTrack.n).toEqual(19);
            ud.undo();
            expect(childTest.motherDNT.n).toEqual(15);
            expect(childTest.childDNT.n).toEqual(44);
            expect(childTest.childDoTrack.n).toEqual(18);
        });

        test("test 1", () => {
            @Undoable()
            class T {
                constructor(public n: number) {}
            }
            class MotherTest {
                @UndoDoNotRecurs
                motherDNT: T;
                constructor() {
                    this.motherDNT = new T(42);
                }
            }
            @Undoable()
            class ChildTest extends MotherTest {
                @UndoDoNotRecurs
                childDNT: T;
                childDoTrack: T;
                constructor() {
                    super();
                    this.childDNT = new T(43);
                    this.childDoTrack = new T(18);
                }
            }
            const childTest = new ChildTest();
            const ud = new UndoRedo(childTest);
            expect(childTest.motherDNT.n).toEqual(42);
            expect(childTest.childDNT.n).toEqual(43);
            expect(childTest.childDoTrack.n).toEqual(18);
            childTest.motherDNT.n = 15;
            childTest.childDNT.n = 44;
            childTest.childDoTrack.n = 19;
            ud.save();
            expect(childTest.motherDNT.n).toEqual(15);
            expect(childTest.childDNT.n).toEqual(44);
            expect(childTest.childDoTrack.n).toEqual(19);
            ud.undo();
            expect(childTest.motherDNT.n).toEqual(15);
            expect(childTest.childDNT.n).toEqual(44);
            expect(childTest.childDoTrack.n).toEqual(18);
        });

        test("test 2", () => {
            @Undoable()
            class T {
                constructor(public n: number) {}
            }
            @Undoable()
            class MotherTest {
                @UndoDoNotTrack
                motherDNT: T;
                constructor() {
                    this.motherDNT = new T(42);
                }
            }
            @Undoable()
            class ChildTest extends MotherTest {}
            const childTest = new ChildTest();
            const ud = new UndoRedo(childTest);
            expect(childTest.motherDNT.n).toEqual(42);
            childTest.motherDNT.n = 15;
            ud.save();
            expect(childTest.motherDNT.n).toEqual(15);
            ud.undo();
            expect(childTest.motherDNT.n).toEqual(15);
        });
    });
});
