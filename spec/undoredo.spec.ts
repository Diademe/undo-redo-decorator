/* eslint-disable no-empty-function */
import { UndoRedo, Undoable } from "../src";

@Undoable()
class Obj {
    constructor(public a: number) { }
    b: number;
}
describe("[undo | redo] Possible", () => {
    let obj: any;
    let ud: UndoRedo;

    beforeEach(() => {
        obj = new Obj(1);
        obj.a = 1;
        ud = new UndoRedo(obj);
    });

    test("save doesn't modify any thing", () => {
        expect(ud.getCurrentIndex()).toEqual(0);
    });

    test("save when noting has been recorded", () => {
        ud.save();
        expect(ud.getCurrentIndex()).toBe(0);
        ud.save();
        expect(ud.getCurrentIndex()).toBe(0);
    });

    test("record the same object doesn't do anything", () => {
        ud.save();
        expect(ud.getCurrentIndex()).toBe(0);
        obj.a = 1;
        ud.save();
        expect(ud.getCurrentIndex()).toEqual(0);
    });

    test("getCurrentIndex", () => {
        expect(ud.getCurrentIndex()).toBe(0);
        obj.a = 1;
        ud.save();
        obj.a = 1;
        ud.save();
        expect(ud.getCurrentIndex()).toBe(0);
        obj.a = 1;
        ud.save();
        obj.a = 2;
        ud.save();
        obj.a = 1;
        ud.save();
        expect(ud.getCurrentIndex()).toBe(2);
        ud.undo(0);
        expect(ud.getCurrentIndex()).toBe(0);
        ud.redo();
        expect(ud.getCurrentIndex()).toBe(1);
    });

    test("undo | redo", () => {
        expect(ud.getCurrentIndex()).toBe(0);
        expect(obj.a).toBe(1);
        obj.a = 1;
        ud.save();
        expect(obj.a).toBe(1);
        expect(ud.getCurrentIndex()).toBe(0);

        obj.a = 2;
        expect(obj.a).toBe(2);
        ud.save();
        expect(obj.a).toBe(2);
        expect(ud.getCurrentIndex()).toBe(1);

        ud.undo();
        expect(obj.a).toBe(1);
        expect(ud.getCurrentIndex()).toBe(0);
        expect(obj).toEqual(new Obj(1));
    });
});