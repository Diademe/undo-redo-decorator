import { Undoable, UndoRedo } from "../src/index";

describe("static", () => {
    @Undoable()
    class A {
        static st = 1;
    }

    test("static", () => {
        const ud = new UndoRedo(A);
        A.st = 2;
        expect(A.st).toBe(2);
        ud.undo();
        expect(A.st).toBe(1);
    })

});