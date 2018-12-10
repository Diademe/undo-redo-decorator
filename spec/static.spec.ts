import { Undoable, UndoRedo } from "../src/index";

describe("static", () => {
    /* Attention, Class history are not reinitialized between test */
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
        expect(ud.undoPossible()).toBe(false);
        expect(ud.getCurrentIndex()).toBe(0);

        expect((A as any).stb).toBeUndefined();
        expect(B.sta).toBeDefined();
        A.st = 2;
        ud.save();
        expect(ud.getCurrentIndex()).toBe(1);
        expect(A.st).toBe(2);
        expect(B.st).toBe(1);
        expect(ud.undoPossible()).toBe(true);
        ud.undo();
        expect(ud.redoPossible()).toBe(true);
        expect(A.st).toBe(1);

        B.st = 3;
        ud.save();
        expect(ud.redoPossible()).toBe(false);
        expect(A.st).toBe(1);
        expect(B.st).toBe(3);
        ud.undo();
        expect(A.st).toBe(1);
        expect(B.st).toBe(1);
    })
});
