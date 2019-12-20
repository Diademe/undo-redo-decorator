import { Undoable, UndoRedo } from "../src/index";

describe("hesitance", () => {
    @Undoable()
    class Mother {
        motherName: string;
        prop: string;
        constructor() {
            this.motherName = "mother";
            this.prop = "mother";
        }
    }

    @Undoable()
    class Child extends Mother {
        childName: string;
        prop: string;

        constructor() {
            super();
            this.childName = "child";
            this.prop = "child";
        }
    }

    let child: Child;
    let mother: Mother;

    beforeEach(() => {
        child = new Child();
        mother = new Mother();
    });

    test("Register", () => {
        @Undoable()
        class MotherRegister {
            constructor(private ud: UndoRedo) { }
            onInit() {
                ud.add(this);
            }
            motherMember = 1;
        }
        @Undoable()
        class ChildRegister extends MotherRegister {
            constructor(arg: UndoRedo) {
                super(arg);
            }
            childMember = 2;
        }
        const ud = new UndoRedo();
        const child = new ChildRegister(ud);
        child.onInit();
        child.childMember = 3;
        ud.save();
        expect(child.childMember).toBe(3);
        ud.undo();
        expect(child.childMember).toBe(2);
    });

    test("instanceof", () => {
        expect(child).toBeInstanceOf(Child);
        expect(child).toBeInstanceOf(Mother);
        expect(mother).toBeInstanceOf(Mother);
    });

    test("non static", () => {
        expect(child.childName).toEqual("child");
        expect(mother.motherName).toEqual("mother");
    });
});

describe("hesitance with only child decorated by Undoable", () => {

    test("Register", () => {
        class MotherRegister {
            constructor(private ud: UndoRedo) { }
            onInit() {
                ud.add(this);
            }
            motherMember = 1;
        }
        @Undoable()
        class ChildRegister extends MotherRegister {
            constructor(arg: UndoRedo) {
                super(arg);
            }
            childMember = 2;
        }
        const ud = new UndoRedo();
        const child = new ChildRegister(ud);
        child.onInit();
        child.childMember = 3;
        ud.save();
        expect(child.childMember).toBe(3);
        ud.undo();
        expect(child.childMember).toBe(2);
    });

    class Mother {
        motherName: string;
        prop: string;
        constructor() {
            this.motherName = "mother";
            this.prop = "mother";
        }
    }

    @Undoable()
    class Child extends Mother {
        childName: string;
        prop: string;

        constructor() {
            super();
            this.childName = "child";
            this.prop = "child";
        }
    }

    let child: Child;
    let mother: Mother;

    beforeEach(() => {
        child = new Child();
        mother = new Mother();
    });

    test("instanceof", () => {
        expect(child).toBeInstanceOf(Child);
        expect(child).toBeInstanceOf(Mother);
        expect(mother).toBeInstanceOf(Mother);
    });

    test("property", () => {
        expect(child.childName).toEqual("child");
        expect(mother.motherName).toEqual("mother");
    });
});
