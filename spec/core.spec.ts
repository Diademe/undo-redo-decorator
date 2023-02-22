/* eslint-disable no-empty-function */
import { MasterIndex } from "../src/core";
import { SuperArray } from "../src/type";
import { UndoRedo, Undoable } from "../src";
import { notDefined } from "../src/utils";

describe("core", () => {
    describe("SuperArray", () => {
        let val: number[];
        let a: SuperArray<number[]>;
        beforeEach(() => {
            val = [1];
            a = new SuperArray();
            a.push(val);
        });
        test("from", () => {
            const b = SuperArray.from(val);
            expect(b).toBeInstanceOf(SuperArray);
            expect(b).not.toEqual(val);
        });

        test("clone", () => {
            const b = a.clone();
            expect(b).toBeInstanceOf(SuperArray);
            expect(b).not.toBe(a);
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
            expect(history.reverseFindIndex((e: number) => e === 6)).toBe(0);
            expect(history.reverseFindIndex((e: number) => e === 4)).toBe(4);
            expect(history.reverseFindIndex((e: number) => e === 3)).toBe(5);
        });
    });

    describe("MasterIndex", () => {
        describe("[undo | redo] Possible", () => {
            let m: MasterIndex;
            let h: SuperArray<[number, number]>;
            // initial state: nothing in history,

            beforeEach(() => {
                m = new MasterIndex();
                h = new SuperArray<[number, number]>([0, notDefined]);
            });

            test("initial state : nothing possible", () => {
                expect(m.redoPossible()).toBe(false);
                expect(m.getCurrentIndex()).toBe(0);
            });

            test("invalid undo parameter", () => {
                m.set<Number, any>(h, 1);
                m.saveInit();
                m.set<Number, any>(h, 2);
                expect(m.getCurrentIndex()).toBe(1);
                expect(() => m.undo(-1)).toThrow();
                expect(() => m.undo(1)).not.toThrow();
                expect(() => m.undo(2)).toThrow();
                expect(() => m.undo()).not.toThrow();
            });

            test("invalid redo parameter", () => {
                m.set<Number, any>(h, 1); // index = 0
                m.saveInit();
                m.set<Number, any>(h, 2); // index = 1
                expect(() => m.redo(0)).toThrow();
                expect(() => m.redo(1)).not.toThrow();
                expect(() => m.redo(2)).toThrow();
                expect(() => m.redo(3)).toThrow();
                m.undo();
                expect(() => m.redo()).not.toThrow();
            });

            test("redoPossible", () => {
                expect(m.redoPossible()).toBe(false);
                m.set<Number, any>(h, 1);
                expect(m.redoPossible()).toBe(false);
                expect(m.getCurrentIndex()).toBe(0);
                m.saveInit();
                m.set<Number, any>(h, 2);
                expect(m.redoPossible()).toBe(false);
                m.undo();
                expect(m.redoPossible()).toBe(true);
                m.redo();
                expect(m.redoPossible()).toBe(false);
            });

            test("maxRedoPossible", () => {
                expect(m.maxRedoPossible()).toBe(0);
                m.set<Number, any>(h, 1);
                expect(m.maxRedoPossible()).toBe(0);
                m.saveInit();
                m.set<Number, any>(h, 2);
                expect(m.maxRedoPossible()).toBe(0);

                m.undo();
                expect(m.maxRedoPossible()).toBe(1);

                m.redo();
                expect(m.maxRedoPossible()).toBe(0);
            });

            test("setMaxHistorySize", () => {
                m.minIndex = 4;
                m.saveInit();
                m.set<Number, any>(h, 1);
                m.saveInit();
                m.set<Number, any>(h, 2);
                m.saveInit();
                m.set<Number, any>(h, 3);
                m.saveInit();
                m.set<Number, any>(h, 4);
                m.saveInit();
                m.set<Number, any>(h, 5);
                m.saveInit();
                m.set<Number, any>(h, 6);
                expect(h).toEqual([[0, notDefined], [4, 4], [5, 5], [6, 6]]);
                m.minIndex = 5;
                m.saveInit();
                m.set<Number, any>(h, 7);
                expect(h).toEqual([[0, notDefined], [5, 5], [6, 6], [7, 7]]);
            });
        });


        test("undo | redo", () => {
            const m = new MasterIndex();
            const h = new SuperArray<[number, number]>([0, notDefined]);
            expect(m.getCurrentIndex()).toBe(0);
            m.set<Number, any>(h, 0);
            expect(h).toEqual([[0, 0]]);

            m.saveInit();
            m.set<Number, any>(h, 1);
            expect(m.getCurrentIndex()).toBe(1);

            expect(h).toEqual([[0, 0], [1, 1]]);

            m.undo(0);
            m.saveInit();
            m.set<Number, any>(h, 3);

            expect(h).toEqual([[0, 0], [1, 3]]);

            m.saveInit();
            m.set<Number, any>(h, 2);
            expect(h).toEqual([[0, 0], [1, 3], [2, 2]]);
        });
    });

    describe("shallow recursive", () => {
        @Undoable()
        class List {
            constructor (public val = 0, public next?: List) {}
        }

        let l: List;
        let ud: UndoRedo;

        beforeEach(() => {
            l = new List(3, new List(2, new List(1, new List (0))));
            ud = new UndoRedo(l);
        });

        test("shallow undo redo", () => {
            expect(l.val).toBe(3);
            expect(l.next.val).toBe(2);
            expect(l.next.next.val).toBe(1);
            expect(l.next.next.next.val).toBe(0);
            l.val = 4;
            l.next.val = 5;
            l.next.next.val = 6;
            l.next.next.next.val = 7;
            ud.save([], {0: [l]});
            expect(l.val).toBe(4);
            expect(l.next.val).toBe(5);
            expect(l.next.next.val).toBe(6);
            expect(l.next.next.next.val).toBe(7);
            ud.undo(undefined, [], {1: [l]});
            expect(l.val).toBe(3);
            expect(l.next.val).toBe(2);
            expect(l.next.next.val).toBe(6);
            expect(l.next.next.next.val).toBe(7);
            ud.redo(undefined, [], {2: [l]});
            expect(l.val).toBe(4);
            expect(l.next.val).toBe(2);
            // only saved value is for index = 1, value saved is 1
            expect(l.next.next.val).toBe(1);
            expect(l.next.next.next.val).toBe(7);
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
        class Child extends GetterSetter {}

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
            expect(getSet.SGMember).toBeNaN();
            getSet.SGMember = 1;
            ud.save();
            expect(getSet.SGMember).toBe(2);
            expect(ud.getCurrentIndex()).toBe(1);
            ud.undo();
            expect(getSet.SGMember).toBeNaN();
        });

        test("inherited get set", () => {
            getSet.SGMember = 1;
            expect(getSet.SGMember).toBe(2);
            ud.undo();
            expect(getSet.SGMember).toBeNaN();
        });
    });
});
