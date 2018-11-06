import { cloneClass, Undoable, cloneFunc } from "../src";
import { clone } from "../src/clone";

describe("clone", () => {
    @Undoable()
    class Foo {
        public array = [1, 2, 3];
        constructor(public name: string) {}
        // the clone function is inside the class, it is evaluated before the class Foo being warped.
        @cloneClass
        clone(): Foo {
            return new Foo("clone of " + this.name);
        }
    }

    @Undoable()
    class Bar {
        public array = [4, 5, 6];
        constructor(public name: string) {}
    }
    // the clone function is outside the class Bar, so its first argument is a proxy and not the original class
    cloneFunc(Bar, (obj: Bar): Bar => {
        const res = new Bar("clone of " + obj.name);
        res.array = obj.array;
        return res;
    });

    @Undoable()
    class Baz {
        public array = [7, 8, 9];
        constructor(public name: string) {}
    }

    test("cloneClass", () => {
        const foo = new Foo("foo");
        const fooClone = clone.get((foo as any).__proxyInternal__.constructor.originalConstructor, foo);
        expect(fooClone).toBeInstanceOf(Foo);
        expect(fooClone.name).toEqual("clone of foo");
        expect(fooClone.array).toEqual(foo.array);
    });

    test("cloneFunc", () => {
        const bar = new Bar("bar");
        // here, the clone function is outside the class, so when it reference Bar, it is actually the warper of bar that is called
        const barClone = clone.get(Bar, bar);
        expect(barClone).toBeInstanceOf(Bar);
        expect(barClone.name).toEqual("clone of bar");
        expect(barClone.array).toEqual(bar.array);
    });

    test("default", () => {
        const baz = new Baz("baz");
        // default clone, nothing to worries about
        const bazClone = clone.get(Baz, baz);
        expect(bazClone).toEqual(baz);
    });
});
