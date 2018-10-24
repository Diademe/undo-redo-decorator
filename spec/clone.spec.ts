import { cloneClass, Undoable, cloneFunc } from "../src";
import { clone } from "../src/clone";

describe("clone", () => {
    @Undoable
    class Foo {
        public array = [1, 2, 3];
        constructor(public name: string) {}
        @cloneClass
        clone(): Foo {
            return new Foo("clone of " + this.name);
        }
    }

    @Undoable
    class Bar {
        public array = [4, 5, 6];
        constructor(public name: string) {}
    }
    cloneFunc(Bar, (obj: Bar): Bar => {
        const res = new Bar("clone of " + obj.name);
        res.array = obj.array;
        return res;
    });

    @Undoable
    class Baz {
        public array = [7, 8, 9];
        constructor(public name: string) {}
    }

    test("cloneClass", () => {
        const foo = new Foo("foo");
        const fooClone = clone.get((foo as any).__originalConstructor__, foo);
        expect(fooClone).toBeInstanceOf(Foo);
        expect(fooClone.name).toEqual("clone of foo");
        expect(fooClone.array).toEqual(foo.array);
    });

    test("cloneFunc", () => {
        const bar = new Bar("bar");
        const barClone = clone.get((bar as any).__originalConstructor__, bar);
        expect(barClone).toBeInstanceOf(Bar);
        expect(barClone.name).toEqual("clone of bar");
        expect(barClone.array).toEqual(bar.array);
    });

    test("default", () => {
        const baz = new Baz("baz");
        const bazClone = clone.get((baz as any).__originalConstructor__, baz);
        expect(bazClone).toBe(bazClone);
    });
});
