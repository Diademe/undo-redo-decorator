import { Undoable, UndoInit, UndoableNoParent, UndoRedo, UndoDoNotTrack } from "../src/index";
import { is_constructor } from "../src/utils";

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
    @UndoableNoParent()
    class Foo {
        constructor(public name: string) {}

        @save
        static cloneStatic() {
            return new Foo("default");
        }

        @save
        clone() {
            return new Foo("clone of " + this.name);
        }
    }

    let foo: Foo;

    beforeEach(() => {
        foo = new Foo("foo");
    });

    test("static", () => {
        expect(db.has((foo as any).constructor.__originalConstructor__)).toBe(true);
        expect(db.has(Foo)).toBe(true);
    });

    test("nonEnumerable", () => {
        @UndoableNoParent(["A"])
        class A {}
        @Undoable(["B"])
        class B extends A {}
        @Undoable(["C"])
        class C extends B {}
        @Undoable(["D"])
        class D extends A {}
        expect(((new A()) as any).__proxyInternal__.constructor.nonEnumerableWatch).toEqual(["A"]);
        expect(((new B()) as any).__proxyInternal__.constructor.nonEnumerableWatch).toEqual(["B", "A"]);
        expect(((new C()) as any).__proxyInternal__.constructor.nonEnumerableWatch).toEqual(["C", "B", "A"]);
        expect(((new D()) as any).__proxyInternal__.constructor.nonEnumerableWatch).toEqual(["D", "A"]);
    });

    describe("factory and initialization", () => {
        enum Value { default, constructor, initialization };
        test("default", () => {
            @UndoableNoParent()
            class Test {
                member = Value.default;
                constructor(init = true) {
                    if (init) {
                        this.member = Value.constructor;
                    }
                }
                init() {
                    this.member = Value.initialization;
                }
            }
            expect(new Test(false).member).toEqual(Value.default);
        });

        test("constructor", () => {
            @UndoableNoParent()
            class Test {
                member = Value.default;
                constructor(init = true) {
                    if (init) {
                        this.member = Value.constructor;
                    }
                }
                init() {
                    this.member = Value.initialization;
                }
            }
            expect(new Test().member).toEqual(Value.constructor);
        });

        test("do not track", () => {
            @UndoableNoParent()
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
            expect(childTest.motherDNT).toEqual(15);
            expect(childTest.childDNT).toEqual(44);
            expect(childTest.childDoTrack).toEqual(19);
            ud.undo();
            expect(childTest.motherDNT).toEqual(15);
            expect(childTest.childDNT).toEqual(44);
            expect(childTest.childDoTrack).toEqual(18);
        });

        describe("initialization", () => {
            test("simple", () => {
                @UndoableNoParent()
                class Test {
                    member = Value.default;
                    constructor(init = true) {
                        if (init) {
                            this.member = Value.constructor;
                        }
                    }
                    @UndoInit
                    init() {
                        this.member = Value.initialization;
                    }
                }
                expect(new Test().member).toEqual(Value.initialization);
            });

            test("inheritance", () => {
                @UndoableNoParent()
                class Mother {
                    member = 1;
                    @UndoInit
                    initM() {
                        this.member += 3;
                    }
                }
                @Undoable()
                class Child  extends Mother {
                    @UndoInit
                    initC() {
                        this.member *= 2;
                    }
                }
                expect(new Child().member).toEqual(8);
            });
        });
    });
});
