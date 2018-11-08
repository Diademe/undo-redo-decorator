import { MasterIndex } from "../src/core";
import { Index, SuperArray } from "../src/type";
import { UndoRedo, Undoable } from "../src";

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

    describe("SuperArray", () => {
        let val: number[];
        let a: SuperArray<number[]>;
        beforeEach(() => {
            val = [1];
            a = new SuperArray();
            a.push(val);
        })
        test("from", () => {
            const b = SuperArray.from(val);
            expect(b).toBeInstanceOf(SuperArray);
            expect(b).not.toEqual(val);
        });

        test("clone", () => {
            const b = a.clone();
            expect(b).toBeInstanceOf(SuperArray);
            expect(b).not.toEqual(a);
        });
    });

    describe("History", () => {
        test("last", () => {
            const a = new SuperArray<number>();
            a.push(1);
            expect(a.last).toBe(1);
            a.push(2);
            expect(a.last).toBe(2);
            a.length = 0;
            expect(a.last).toBe(undefined);
        });

        test("reverseFindIndex", () => {
            const history = new SuperArray<number>();
            history.push(0, 1, 2, 3, 4, 3, 2, 1);
            expect(history.reverseFindIndex((e: number) => e === 6)).toBe(-1);
            expect(history.reverseFindIndex((e: number) => e === 4)).toBe(4);
            expect(history.reverseFindIndex((e: number) => e === 3)).toBe(5);
        });
    });

    describe("MasterIndex", () => {
        describe("[undo | redo] Possible", () => {
            let m: MasterIndex;
            let h: SuperArray<[Index, number]>;
            // initial state: nothing in history,

            beforeEach(() => {
                m = new MasterIndex();
                h = new SuperArray<[Index, number]>();
            });

            test("initial state : nothing possible", () => {
                expect(m.undoPossible()).toBe(false);
                expect(m.redoPossible()).toBe(false);
                expect(m.getCurrentIndex()).toBe(0);
            });

            test("save when noting has been recorded", () => {
                m.set(h, 1);
                m.save();
                expect(m.getCurrentIndex()).toBe(1);
                m.save();
                expect(m.getCurrentIndex()).toBe(1);
            });

            test("record the same object doesn't do anything", () => {
                m.set(h, 1);
                m.save();
                expect(m.getCurrentIndex()).toBe(1);
                m.set(h, 1);
                m.save();
                expect(m.getCurrentIndex()).toBe(1);
            });

            test("invalid undo parameter", () => {
                m.set(h, 1);
                m.save();
                m.set(h, 2);
                expect(() => m.undo(-1)).toThrow();
                expect(() => m.undo(1)).not.toThrow();
                expect(() => m.undo(2)).toThrow();
                expect(() => m.undo()).not.toThrow();
                expect(() => m.undo()).toThrow();
            });

            test("invalid redo parameter", () => {
                m.set(h, 1);
                m.save();
                m.set(h, 2);
                expect(() => m.redo(0)).toThrow();
                expect(() => m.redo(1)).toThrow();
                expect(() => m.redo(2)).toThrow();
                expect(() => m.redo(3)).toThrow();
                m.undo();
                expect(() => m.redo()).not.toThrow();
            });

            test("redo", () => {
                expect(m.redoPossible()).toBe(false);
                m.set(h, 1);
                m.save();
                expect(m.redoPossible()).toBe(false);
                expect(m.getCurrentIndex()).toBe(1);
                expect(m.redoPossible()).toBe(false);
                m.undo();
                expect(m.redoPossible()).toBe(true);
                m.redo();
                expect(m.redoPossible()).toBe(false);
            });

            test("maxRedoPossible", () => {
                expect(m.maxRedoPossible()).toBe(0);
                m.set(h, 1);
                m.save();
                m.set(h, 2);
                m.save();

                m.undo();
                expect(m.maxRedoPossible()).toBe(1);

                m.undo();
                expect(m.maxRedoPossible()).toBe(2);

                m.redo();
                expect(m.maxRedoPossible()).toBe(1);
            });

            test("undo", () => {
                expect(m.undoPossible()).toBe(false);
                m.set(h, 1);
                expect(m.undoPossible()).toBe(true);
                m.save();
                expect(m.undoPossible()).toBe(true);
                expect(m.getCurrentIndex()).toBe(1);
                m.undo();
                expect(m.undoPossible()).toBe(false);
                expect(m.redoPossible()).toBe(true);
                m.redo();
                expect(m.undoPossible()).toBe(true);
            });
        });

        test("getCurrentIndex", () => {
            const m = new MasterIndex();
            const h = new SuperArray<[Index, number]>();
            expect(m.undoPossible()).toBe(false);
            expect(m.getCurrentIndex()).toBe(0);
            m.set(h, 1);
            m.save();
            m.set(h, 1);
            m.save();
            expect(m.getCurrentIndex()).toBe(1);
            m.set(h, 1);
            m.save();
            m.set(h, 1);
            m.save();
            m.set(h, 1);
            m.save();
            expect(m.getCurrentIndex()).toBe(1);
            m.undo(0);
            expect(m.getCurrentIndex()).toBe(0);
        });

        test("undo | redo", () => {
            const m = new MasterIndex();
            const h = new SuperArray<[Index, number]>();
            expect(m.getCurrentIndex()).toBe(0);
            m.set(h, 0);
            expect(h).toEqual([[new Index(1, 0), 0]]);
            m.save();
            expect(m.getCurrentIndex()).toBe(1);

            m.set(h, 1);
            expect(h).toEqual([[new Index(1, 0), 0], [new Index(2, 0), 1]]);
            m.save();
            expect(m.getCurrentIndex()).toBe(2);

            m.undo();

            m.set(h, 2);
            expect(h).toEqual([[new Index(1, 0), 0], [new Index(2, 1), 2]]);
            m.save();
            expect(m.getCurrentIndex()).toBe(2);

            m.set(h, 3);
            expect(h).toEqual([
                [new Index(1, 0), 0],
                [new Index(2, 1), 2],
                [new Index(3, 1), 3]
            ]);
            m.save();
            expect(m.getCurrentIndex()).toBe(3);

            m.set(h, 4);
            expect(h).toEqual([
                [new Index(1, 0), 0],
                [new Index(2, 1), 2],
                [new Index(3, 1), 3],
                [new Index(4, 1), 4]
            ]);
            m.save();
            expect(m.getCurrentIndex()).toBe(4);

            m.undo();

            m.set(h, 5);
            expect(h).toEqual([
                [new Index(1, 0), 0],
                [new Index(2, 1), 2],
                [new Index(3, 1), 3],
                [new Index(4, 2), 5]
            ]);
            m.save();
            expect(m.getCurrentIndex()).toBe(4);

            m.undo(2);

            m.set(h, 6);
            expect(h).toEqual([
                [new Index(1, 0), 0],
                [new Index(2, 1), 2],
                [new Index(3, 3), 6]
            ]);
            m.save();
            expect(m.getCurrentIndex()).toBe(3);

            m.undo(0);
            m.redo(1);

            m.set(h, 7);
            expect(h).toEqual([[new Index(1, 0), 0], [new Index(2, 4), 7]]);
            m.save();
            expect(m.getCurrentIndex()).toBe(2);
        });
    });

    describe("getter setter", () => {
        @Undoable()
        class GetterSetter {
            private _member: number;
            set SGMember(val: number) {
                this._member = val;
            }
            get SGMember() {
                return this._member + 1;
            }
        }

        @Undoable()
        class Child extends GetterSetter { }

        let child: Child;
        let getSet: GetterSetter;
        let ud: UndoRedo;
        beforeEach(() => {
            ud = new UndoRedo();
            child = new Child();
            getSet = new GetterSetter();
            ud.multiAdd([child, getSet]);
        });

        test("get set", () => {
            expect(getSet.SGMember).toBeUndefined();
            getSet.SGMember = 1;
            expect(getSet.SGMember).toBe(2);
            ud.undo();
            expect(() => getSet.SGMember).toThrow();
        });

        test("inherited get set", () => {
            getSet.SGMember = 1;
            expect(getSet.SGMember).toBe(2);
            ud.undo();
            expect(() => getSet.SGMember).toThrow();
        });
    });
});
