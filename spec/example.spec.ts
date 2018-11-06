import { Undoable, UndoRedo } from "../src";

@Undoable()
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

@Undoable()
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

@Undoable()
class LinkedList<T> {
    constructor(public val: T, public next: LinkedList<T>) {}
    static end<T>(list: LinkedList<T>) {
        let elt = list;
        while (elt.next !== undefined && elt.next !== list) {
            elt = elt.next;
        }
        return elt
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

    test("stack of pair", () => {
        const stack = new Fifo<Pair<number>>();
        const undoRedo = new UndoRedo(stack);
        expect(undoRedo.getCurrentIndex()).toBe(1);
        stack.push(new Pair(1, 1));
        stack.push(new Pair(2, 2));
        undoRedo.save();
        expect(stack.toArray()).toEqual([new Pair(1, 1), new Pair(2, 2)]);
        stack[0].first = 0;
        expect(stack.toArray()).toEqual([new Pair(0, 1), new Pair(2, 2)]);
        undoRedo.undo();
        expect(stack.toArray()).toEqual([new Pair(1, 1), new Pair(2, 2)]);
        undoRedo.redo();
        expect(stack.toArray()).toEqual([new Pair(0, 1), new Pair(2, 2)]);
    });

    test("stack of pair", () => {
        const listHead0 = new LinkedList<Pair<number>>(new Pair(0, 0), undefined);
        const listHead1 = new LinkedList<Pair<number>>(new Pair(1, 0), undefined);
        let listPt0 = listHead0;
        let listPt1 = listHead1;
        for (let i = 1; i < 3; i++) {
            const newElt0 = new LinkedList<Pair<number>>(new Pair(0, i), listPt0);
            const newElt1 = new LinkedList<Pair<number>>(new Pair(1, i), listPt1);
            listPt0 = newElt0;
            listPt1 = newElt1;
        }
        listHead0.next = listPt0;
        listHead1.next = listPt1;
        const undoRedo = new UndoRedo(listHead0);
        listPt0 = listHead0;
        listPt1 = listHead1;
        let i = 0;
        // check original list is as intended
        do {
            expect(listPt0.val).toEqual(new Pair(0, i));
            expect(listPt1.val).toEqual(new Pair(1, i));
            listPt0 = listPt0.next;
            listPt1 = listPt1.next;
            i = (i - 1 + 3) % 3 ;
        } while (listPt0 !== listHead0);

        undoRedo.save();

        listPt0 = LinkedList.end(listHead0);
        listPt0.next = listHead1;

        undoRedo.save();
        expect(listHead0.val).toEqual(new Pair(0, 0));
        expect(listHead0.next.val).toEqual(new Pair(0, 2));
        expect(listHead0.next.next.val).toEqual(new Pair(0, 1));
        expect(listHead0.next.next.next.val).toEqual(new Pair(1, 0));
        expect(listHead0.next.next.next.next.val).toEqual(new Pair(1, 2));
        expect(listHead0.next.next.next.next.next.val).toEqual(new Pair(1, 1));
        expect(listHead0.next.next.next.next.next.next.val).toEqual(new Pair(1, 0));
        expect(listHead0.next.next.next.next.next.next.val).toBe(listHead1.val);

        undoRedo.undo();
        expect(listHead0.val).toEqual(new Pair(0, 0));
        expect(listHead0.next.val).toEqual(new Pair(0, 2));
        expect(listHead0.next.next.val).toEqual(new Pair(0, 1));
        expect(listHead0.next.next.next.val).toEqual(new Pair(0, 0));
        expect(listHead0.next.next.next.val).toBe(listHead0.val);

        undoRedo.redo();
        expect(listHead0.val).toEqual(new Pair(0, 0));
        expect(listHead0.next.val).toEqual(new Pair(0, 2));
        expect(listHead0.next.next.val).toEqual(new Pair(0, 1));
        expect(listHead0.next.next.next.val).toEqual(new Pair(1, 0));
        expect(listHead0.next.next.next.next.val).toEqual(new Pair(1, 2));
        expect(listHead0.next.next.next.next.next.val).toEqual(new Pair(1, 1));
        expect(listHead0.next.next.next.next.next.next.val).toEqual(new Pair(1, 0));
        expect(listHead0.next.next.next.next.next.next.val).toBe(listHead1.val);
    });
});
