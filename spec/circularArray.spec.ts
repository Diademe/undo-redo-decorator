import {
    CircularArray,
    UndoRedoHistoryError,
    UndoRedoHistorySizeError
} from "../src/circularArray";

describe("Circular Array", () => {
    describe("get / set", () => {
        test("max size reached", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
        });

        test("max not reached", () => {
            const circularArray = new CircularArray<string>(3);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.getMinIndex()).toBe(0);
            expect(circularArray.getMaxIndex()).toBe(2);
        });

        test("element exist", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
        });

        describe("element doesn't", () => {
            test("forgotten", () => {
                const circularArray = new CircularArray<string>(2);
                circularArray.set(0, "A");
                circularArray.set(1, "B");
                circularArray.set(2, "C");
                expect(circularArray.get(0)).toBe(undefined);
            });

            test("not yet written", () => {
                const circularArray = new CircularArray<string>(2);
                circularArray.set(0, "A");
                circularArray.set(1, "B");
                circularArray.set(2, "C");
                expect(circularArray.get(3)).toBe(undefined);
            });
        });

        // a new index may be among existing index of 1 + max index
        test("index not continuous", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            expect(() => circularArray.set(2, "C")).toThrow(UndoRedoHistoryError);
        });
    });
    describe("set size", () => {
        describe("size < 0", () => {
            test("constructor", () => {
                expect(() => new CircularArray(-1)).toThrow(UndoRedoHistorySizeError);
            });

            test("set size", () => {
                const circularArray = new CircularArray(1);
                expect(() => circularArray.resize(-1)).toThrow(UndoRedoHistorySizeError);
            });
        });
        describe("size < 0", () => {
            test("constructor", () => {
                expect(() => new CircularArray(-1)).toThrow(UndoRedoHistorySizeError);
            });

            test("set size", () => {
                const circularArray = new CircularArray(1);
                expect(() => circularArray.resize(-1)).toThrow(UndoRedoHistorySizeError);
            });
        });

        test("max size increased", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.resize(3);
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.set(3, "D");
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(5)).toBe(undefined);
        });

        test("max size decreased", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.resize(1);
            expect(circularArray.getMinIndex()).toBe(2);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe(undefined);
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.set(3, "D");
            expect(circularArray.getMinIndex()).toBe(3);
            expect(circularArray.getMaxIndex()).toBe(3);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe(undefined);
            expect(circularArray.get(2)).toBe(undefined);
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(5)).toBe(undefined);
        });

        test("max size unchanged", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.resize(2);
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
        });

        test("max size to unlimited", () => {
            const circularArray = new CircularArray<string>(2);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.resize(0);
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(2);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe(undefined);
            circularArray.set(3, "D");
            circularArray.set(4, "E");
            circularArray.set(5, "F");
            circularArray.set(6, "G");
            circularArray.set(7, "H");
            circularArray.set(8, "I");
            expect(circularArray.getMinIndex()).toBe(1);
            expect(circularArray.getMaxIndex()).toBe(8);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(4)).toBe("E");
            expect(circularArray.get(5)).toBe("F");
            expect(circularArray.get(6)).toBe("G");
            expect(circularArray.get(7)).toBe("H");
            expect(circularArray.get(8)).toBe("I");
        });

        test("max size to limited", () => {
            const circularArray = new CircularArray<string>(0);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            circularArray.set(3, "D");
            circularArray.set(4, "E");
            circularArray.set(5, "F");
            circularArray.set(6, "G");
            circularArray.set(7, "H");
            circularArray.set(8, "I");
            expect(circularArray.getMinIndex()).toBe(0);
            expect(circularArray.getMaxIndex()).toBe(8);
            expect(circularArray.get(0)).toBe("A");
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(4)).toBe("E");
            expect(circularArray.get(5)).toBe("F");
            expect(circularArray.get(6)).toBe("G");
            expect(circularArray.get(7)).toBe("H");
            expect(circularArray.get(8)).toBe("I");
            circularArray.resize(3);
            expect(circularArray.getMinIndex()).toBe(6);
            expect(circularArray.getMaxIndex()).toBe(8);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe(undefined);
            expect(circularArray.get(2)).toBe(undefined);
            expect(circularArray.get(1)).toBe(undefined);
            expect(circularArray.get(2)).toBe(undefined);
            expect(circularArray.get(3)).toBe(undefined);
            expect(circularArray.get(4)).toBe(undefined);
            expect(circularArray.get(5)).toBe(undefined);
            expect(circularArray.get(6)).toBe("G");
            expect(circularArray.get(7)).toBe("H");
            expect(circularArray.get(8)).toBe("I");
            expect(circularArray.get(9)).toBe(undefined);
        });
    });
    describe("splice", () => {
        test("no oversize", () => {
            const circularArray = new CircularArray<string>(5);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            circularArray.set(3, "D");
            circularArray.set(4, "E");
            expect(circularArray.getMinIndex()).toBe(0);
            expect(circularArray.getMaxIndex()).toBe(4);
            expect(circularArray.get(0)).toBe("A");
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(4)).toBe("E");
            expect(circularArray.get(5)).toBe(undefined);
            circularArray.splice(2);
            expect(circularArray.get(0)).toBe("A");
            expect(circularArray.get(1)).toBe("B");
            expect(circularArray.get(2)).toBe(undefined);
            expect(circularArray.get(3)).toBe(undefined);
            expect(circularArray.get(4)).toBe(undefined);
            expect(circularArray.get(5)).toBe(undefined);
        });

        test("oversize", () => {
            const circularArray = new CircularArray<string>(3);
            circularArray.set(0, "A");
            circularArray.set(1, "B");
            circularArray.set(2, "C");
            circularArray.set(3, "D");
            circularArray.set(4, "E");
            expect(circularArray.getMinIndex()).toBe(2);
            expect(circularArray.getMaxIndex()).toBe(4);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe(undefined);
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(4)).toBe("E");
            expect(circularArray.get(5)).toBe(undefined);
            circularArray.splice(4);
            expect(circularArray.get(0)).toBe(undefined);
            expect(circularArray.get(1)).toBe(undefined);
            expect(circularArray.get(2)).toBe("C");
            expect(circularArray.get(3)).toBe("D");
            expect(circularArray.get(4)).toBe(undefined);
            expect(circularArray.get(5)).toBe(undefined);
        });
    });
});