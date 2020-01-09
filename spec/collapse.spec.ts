import { Undoable, UndoRedo } from "../src/index";

describe("collapse", () => {
    test("simple example", () => {
        @Undoable()
        class Test {
            prop: number;
            constructor() {
                this.prop = 0;
            }
        }
        const t = new Test();
        const ud = new UndoRedo(t);
        ud.save();
        expect(t.prop).toBe(0);

        t.prop = 1;
        ud.save();
        expect(t.prop).toBe(1);

        t.prop = 2;
        ud.save();
        expect(t.prop).toBe(2);

        t.prop = 3;
        ud.save();
        expect(t.prop).toBe(3);

        t.prop = 4;
        ud.save();
        expect(t.prop).toBe(4);
        expect(ud.getCurrentIndex()).toBe(4);

        ud.collapse(2);
        expect(t.prop).toBe(4);
        expect(ud.maxRedoPossible()).toBe(0);
    });

    // test what append if we made an undo before the collapse
    test("while being in a undoable state", () => {
        @Undoable()
        class Test {
            prop: number;
            constructor() {
                this.prop = 0;
            }
        }
        const t = new Test();
        const ud = new UndoRedo(t);
        expect(t.prop).toBe(0);

        t.prop = 1;
        ud.save();
        expect(t.prop).toBe(1);

        t.prop = 2;
        ud.save();
        expect(t.prop).toBe(2);

        t.prop = 3;
        ud.save();
        expect(t.prop).toBe(3);

        t.prop = 4;
        ud.save();
        expect(t.prop).toBe(4);
        expect(ud.getCurrentIndex()).toBe(4);

        ud.undo();
        expect(t.prop).toBe(3);
        expect(ud.getCurrentIndex()).toBe(3);
        expect(ud.maxRedoPossible()).toBe(1);

        ud.collapse(2);
        expect(t.prop).toBe(3);
        expect(ud.maxRedoPossible()).toBe(0);
    });

    test("collapse to same value", () => {
        @Undoable()
        class Test {
            prop: number;
            constructor() {
                this.prop = 0;
            }
        }
        const t = new Test();
        const ud = new UndoRedo(t);
        expect(t.prop).toBe(0);

        t.prop = 1;
        ud.save();
        expect(t.prop).toBe(1);

        t.prop = 2;
        ud.save();
        expect(t.prop).toBe(2);

        t.prop = 3;
        ud.save();
        expect(t.prop).toBe(3);

        t.prop = 2;
        ud.save();
        expect(t.prop).toBe(2);
        expect(ud.getCurrentIndex()).toBe(4);

        ud.collapse(2);
        expect(t.prop).toBe(2);
        expect(ud.maxRedoPossible()).toBe(0);
        expect((t as any).__undoInternal__.history.get("prop").history.length).toBe(3);
    });

    test("multiple value", () => {
        @Undoable()
        class Test {
            prop1: number;
            prop2: string;
            constructor() {
                this.prop1 = 0;
                this.prop2 = "a";
            }
        }
        const t = new Test();
        const ud = new UndoRedo(t);
        expect(ud.getCurrentIndex()).toBe(0);
        t.prop1 = 1;
        t.prop2 = "b";
        ud.save();
        expect(t.prop1).toBe(1);
        expect(t.prop2).toBe("b");
        expect(ud.getCurrentIndex()).toBe(1);

        t.prop1 = 2;
        ud.save();
        expect(t.prop1).toBe(2);
        expect(t.prop2).toBe("b");
        expect(ud.getCurrentIndex()).toBe(2);

        t.prop1 = 3;
        ud.save();
        expect(t.prop1).toBe(3);
        expect(ud.getCurrentIndex()).toBe(3);

        ud.collapse(1);
        expect(t.prop1).toBe(3);
        expect(t.prop2).toBe("b");
        expect(ud.getCurrentIndex()).toBe(1);
        expect(ud.maxRedoPossible()).toBe(0);

        ud.undo()
        expect(ud.getCurrentIndex()).toBe(0);
        expect(t.prop1).toBe(0);
        expect(t.prop2).toBe("a");
        expect(ud.maxRedoPossible()).toBe(1);

        ud.redo();
        expect(t.prop1).toBe(3);
        expect(t.prop2).toBe("b");
        expect(ud.getCurrentIndex()).toBe(1);
        expect(ud.maxRedoPossible()).toBe(0);
    });

    test("multiple value, one created after the other", () => {
        @Undoable()
        class Test {
            prop1: number;
            prop2: string;
            constructor() {
                this.prop1 = 0;
            }
        }
        const t = new Test();
        const ud = new UndoRedo(t);
        expect(ud.getCurrentIndex()).toBe(0);

        t.prop1 = 1;
        ud.save();
        expect(t.prop1).toBe(1);
        expect(t.prop2).toBeUndefined();
        expect(ud.getCurrentIndex()).toBe(1);

        t.prop1 = 2;
        ud.save();
        expect(t.prop1).toBe(2);
        expect(t.prop2).toBeUndefined();
        expect(ud.getCurrentIndex()).toBe(2);

        t.prop1 = 3;
        t.prop2 = "a";
        ud.save();
        expect(t.prop1).toBe(3);
        expect(t.prop2).toBe("a");
        expect(ud.getCurrentIndex()).toBe(3);

        ud.collapse(1);
        expect(t.prop1).toBe(3);
        expect(t.prop2).toBe("a");
        expect(ud.getCurrentIndex()).toBe(1);
        expect(ud.maxRedoPossible()).toBe(0);
    });
});
