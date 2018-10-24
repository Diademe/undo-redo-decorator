import { Undoable, UndoRedo } from "../src";

@Undoable
class Fifo<T> extends Array<T> {
    constructor(args?: any[]) {
        super();
    }
    top(): T {
        return this[this.length - 1];
    }
    add(arg: T) {
        this.push(arg)
    }
    remove(): T {
        return this.pop();
    }
    toArray() {
        return Array.from(this);
    }
}

@Undoable
class Pair<T> {
    constructor(private a: T, private b: T) {}
    get first() {
        return this.a;
    }
    set first(val: T) {
        this.a = val;
    }
    get second() {
        return this.b;
    }
    set second(val: T) {
        this.b = val;
    }
    static lex<T>(a: Pair<T>, b: Pair<T>) {
        if (a.first < b.first) return -1;
        if (a.first === b.first && a.second < b.second) return -1;
        if (a.first === b.first && a.second === b.second) return 0;
        return 1;
    }
}

describe("example", () => {
    test("stack", () => {
        const stack = new Fifo<number>();
        const undoRedo = new UndoRedo(stack);
        expect(undoRedo.getCurrentIndex()).toBe(1);
        undoRedo.save();
        stack.push(1);
        stack.push(2);
        expect(stack.toArray()).toEqual([1, 2]);
        expect(undoRedo.getCurrentIndex()).toBe(2);
        undoRedo.save();
        expect(undoRedo.getCurrentIndex()).toBe(2);
        stack.push(2);
        stack.push(3);
        expect(stack.toArray()).toEqual([1, 2, 2, 3]);
        undoRedo.save();
        expect(undoRedo.getCurrentIndex()).toBe(3);
    });
});
