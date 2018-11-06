import { Undoable, UndoRedo } from "../src/index";

describe("static", () => {
    /* Attention, Class history are not reinitialized between test */
    test("static inheritance", () => {
        @Undoable()
        class A {
            static st = 1;
        }

        @Undoable()
        class B extends A {
            static st1 = 1;
        }
        const ud = new UndoRedo();
        ud.multiAdd([A, B])
        expect(Object.keys(A)).toEqual(["st"]);
        expect(Object.keys(B)).toEqual(["st1"]);
    });

    test("static inheritance", () => {
        @Undoable()
        class A {
            static st = 1;
            static sta = "A";
        }

        @Undoable()
        class B extends A {
            static st = 1;
            static stb = "B";
        }
        const ud = new UndoRedo();
        ud.multiAdd([A, B])

        expect((A as any).stb).toBeUndefined();
        expect(B.sta).toBeDefined();
        A.st = 2;
        expect(A.st).toBe(2);
        expect(B.st).toBe(1);
        expect(ud.undoPossible()).toBe(true);
        ud.undo();
        expect(ud.redoPossible()).toBe(true);
        expect(A.st).toBe(1);

        B.st = 3;
        expect(ud.redoPossible()).toBe(false);
        expect(A.st).toBe(1);
        expect(B.st).toBe(3);
        ud.undo();
        expect(A.st).toBe(1);
        expect(B.st).toBe(1);
    })

});