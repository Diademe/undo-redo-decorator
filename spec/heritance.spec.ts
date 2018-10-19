import { Undoable } from "../src/index";

describe("hesitance", () => {
    @Undoable
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

    @Undoable
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
