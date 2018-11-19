import { Undoable, UndoRedo, UndoableNoParent } from "../src/index";

describe("hesitance", () => {
    @UndoableNoParent()
    class Mother {
        motherName: string;
        nonStatic: string;
        constructor() {
            this.motherName = "mother";
            this.nonStatic = "mother";
        }
        static motherStatic() {
            return 1;
        }
        static staticOverridden() {
            return 1;
        }
    }

    @Undoable()
    class Child extends Mother {
        childName: string;
        nonStatic: string;

        constructor() {
            super();
            this.childName = "child";
            this.nonStatic = "child";
        }
        static childStatic() {
            return 0;
        }
        static staticOverridden() {
            return 0;
        }
    }

    let child: Child;
    let mother: Mother;

    beforeEach(() => {
        child = new Child();
        mother = new Mother();
    });

    test("Register", () => {
        @UndoableNoParent()
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
        expect(child.childMember).toBe(3);
        ud.undo();
        expect(child.childMember).toBe(2);
    });

    test("instanceof", () => {
        expect(child).toBeInstanceOf(Child);
        expect(child).toBeInstanceOf(Mother);
        expect(mother).toBeInstanceOf(Mother);
    });

    test("static", () => {
        expect(Child.childStatic()).toEqual(0);
        expect(Child.staticOverridden()).toEqual(0);
        expect(Mother.motherStatic()).toEqual(1);
    });

    test("non static", () => {
        expect(child.childName).toEqual("child");
        expect(mother.motherName).toEqual("mother");
        expect(Child.staticOverridden()).toEqual(0);
        expect(Mother.motherStatic()).toEqual(1);
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
        @UndoableNoParent()
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
        expect(child.childMember).toBe(3);
        ud.undo();
        expect(child.childMember).toBe(2);
    });

    class Mother {
        motherName: string;
        nonStatic: string;
        constructor() {
            this.motherName = "mother";
            this.nonStatic = "mother";
        }
        static motherStatic = 1;
        static staticOverridden = 1;
    }

    @UndoableNoParent()
    class Child extends Mother {
        childName: string;
        nonStatic: string;

        constructor() {
            super();
            this.childName = "child";
            this.nonStatic = "child";
        }
        static childStatic = 0;
        static staticOverridden = 0;
    }

    let child: Child;
    let mother: Mother;

    beforeEach(() => {
        child = new Child();
        mother = new Mother();
    });

    test("instanceof", () => {
        const ud = new UndoRedo(Child);
        Child.motherStatic = 3;
        Child.childStatic = 3;
        Child.staticOverridden = 3;
        expect(Child.motherStatic).toBe(3);
        expect(Child.childStatic).toBe(3);
        expect(Child.staticOverridden).toBe(3);
        ud.undo();
        expect(Child.motherStatic).toBe(1);
        expect(Child.childStatic).toBe(0);
        expect(Child.staticOverridden).toBe(0);
    });

    test("instanceof", () => {
        expect(child).toBeInstanceOf(Child);
        expect(child).toBeInstanceOf(Mother);
        expect(mother).toBeInstanceOf(Mother);
    });

    test("static", () => {
        expect(Child.childStatic).toEqual(0);
        expect(Child.staticOverridden).toEqual(0);
        expect(Mother.motherStatic).toEqual(1);
    });

    test("non static", () => {
        expect(child.childName).toEqual("child");
        expect(mother.motherName).toEqual("mother");
        expect(Child.staticOverridden).toEqual(0);
        expect(Mother.motherStatic).toEqual(1);
    });
});
