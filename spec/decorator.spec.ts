import { Undoable } from "../src/index";
import { is_constructor } from "../src/utils";

describe("hesitance", () => {
    const db = new Set<any>();
    function save<T extends Object, K extends keyof T>(
        target: T,
        keyName: K,
        _: any
    ) {
        const res = is_constructor(target);
        db.add(res ? target : target.constructor);
    }
    function saveClass<T extends Object>(
        target: T
    ) {
        db.add(target);
    }

    @saveClass
    @Undoable()
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
        expect(db.has((foo as any).__proxyInternal__.constructor.originalConstructor)).toBe(true);
        expect(db.has(Foo)).toBe(true);
    });
});
