import { MasterIndex, History } from "../src/core";

describe("type", () => {
    test("get | set", () => {
        const m = new MasterIndex();
        const h = new History(m, 1);
        expect(h.get()).toBe(1);
        h.set(0);
        expect(h.get()).toEqual(0);
        m.save();
        expect(h.get()).toEqual(0);
        expect(m.getCurrentIndex()).toBe(1);

        h.set(1);
        expect(h.get()).toEqual(1);
        m.save();
        expect(m.getCurrentIndex()).toBe(2);

        m.undo();
        expect(h.get()).toEqual(0);

        h.set(2);
        expect(h.get()).toEqual(2);
        m.save();
        expect(m.getCurrentIndex()).toBe(2);

        h.set(3);
        expect(h.get()).toEqual(3);

        m.save();
        expect(m.getCurrentIndex()).toBe(3);

        h.set(4);
        expect(h.get()).toEqual(4);
        m.save();
        expect(m.getCurrentIndex()).toBe(4);

        m.undo();

        h.set(5);
        expect(h.get()).toBe(5);

        m.save();
        expect(m.getCurrentIndex()).toBe(4);

        expect(h.get()).toBe(5);
        m.undo(2);
        expect(m.getCurrentIndex()).toBe(2);

        h.set(6);
        expect(h.get()).toBe(6);

        m.save();
        expect(m.getCurrentIndex()).toBe(3);

        m.undo(0);
        // h is not defied at index 0 (it is created at index 1)
        expect(h.get()).toBeUndefined();

        m.redo(1);
        expect(h.get()).toBe(0);

        h.set(7);
        expect(h.get()).toBe(7);

        m.save();
        expect(m.getCurrentIndex()).toBe(2);
    });
});
