import { Index, History, MasterIndex } from "../src/core";
import { Undoable } from "../src";


describe("core", () => {
    describe("Index", () => {
        test("compare", () => {
            const a = new Index(0, 1);
            const b = new Index(1, 0);
            const c = new Index(1, 1);
            const d = new Index(1, 1);
            const e = new Index(1, 2);
            expect(a.before(b)).toBe(1);
            expect(a.before(c)).toBe(-1);
            expect(c.before(d)).toBe(0);
            expect(e.before(c)).toBe(1);
        });
    });

    describe("History", () => {
        test("last", () => {
            const a = new History<number>();
            a.push(1);
            expect(a.last()).toBe(1);
            a.push(2);
            expect(a.last()).toBe(2);
            a.length = 0;
            expect(a.last()).toBe(undefined);
        });

        test("reverseFindIndex", () => {
            const history = new History<number>();
            history.push(0, 1, 2, 3, 4, 3, 2, 1);
            expect(history.reverseFindIndex((e) => e === 6)).toBe(-1);
            expect(history.reverseFindIndex((e) => e === 4)).toBe(4);
            expect(history.reverseFindIndex((e) => e === 3)).toBe(5);
        });
    });

    describe("MasterIndex", () => {
        test("[undo | redo]Possible", () => {
            const m = new MasterIndex();
            const h = new History<[Index, number]> ();

            expect(m.undoPossible()).toBe(false);
            expect(m.redoPossible()).toBe(false);
            expect(m.getCurrentIndex()).toBe(0);
            h.push([new Index(0, 0), 1]);
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            m.undo(2);
            expect(m.redoPossible()).toBe(true);
            expect(m.undoPossible()).toBe(true);
            m.set(h, 1); m.save();
            expect(m.undoPossible()).toBe(true);
            expect(m.redoPossible()).toBe(false);
            m.undo(0);
            expect(m.undoPossible()).toBe(false);
            expect(m.redoPossible()).toBe(true);
        });

        test("getCurrentIndex", () => {
            const m = new MasterIndex();
            const h = new History<[Index, number]> ();
            expect(m.undoPossible()).toBe(false);
            expect(m.getCurrentIndex()).toBe(0);
            h.push([new Index(0, 0), 1]);
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            expect(m.getCurrentIndex()).toBe(2);
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            m.set(h, 1); m.save();
            expect(m.getCurrentIndex()).toBe(5);
            m.undo(2);
            expect(m.getCurrentIndex()).toBe(2);
            m.undo(0);
            expect(m.getCurrentIndex()).toBe(0);
        });

        test("undo | redo", () => {
            /*
                        33
                       |
                  31  32
                  |  /
                 21   33
                 |   /
            10  11
            |  /
            00
            */
            const m = new MasterIndex();
            const h = new History<[Index, number]> ();
            h.push([new Index(0, 0), 0]);
            m.set(h, 1);
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 0), 1]]);
            expect(m.getCurrentIndex()).toBe(1);

            m.save();
            m.undo();
            expect(m.getCurrentIndex()).toBe(0);

            m.set(h, 2);
            m.save();
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2]]);
            expect(m.getCurrentIndex()).toBe(1);

            m.set(h, 3);
            m.save();
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2], [new Index(2, 1), 3]]);
            expect(m.getCurrentIndex()).toBe(2);

            m.set(h, 4);
            m.save();
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2], [new Index(2, 1), 3], [new Index(3, 1), 4]]);
            expect(m.getCurrentIndex()).toBe(3);

            m.undo(2);

            m.set(h, 5);
            m.save();
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2], [new Index(2, 1), 3], [new Index(3, 2), 5]]);
            expect(m.getCurrentIndex()).toBe(3);

            m.set(h, 6);
            m.save();
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2], [new Index(2, 1), 3], [new Index(3, 2), 5], [new Index(4, 2), 6]]);
            expect(m.getCurrentIndex()).toBe(4);

            m.undo(0);
            m.redo(4);
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2], [new Index(2, 1), 3], [new Index(3, 2), 5], [new Index(4, 2), 6]]);

            m.undo(1);
            m.set(h, 7);
            expect(h).toEqual([[new Index(0, 0), 0], [new Index(1, 1), 2], [new Index(2, 3), 7]]);

            m.undo(0);
            expect(m.getCurrentIndex()).toBe(0);
        });

    });
});