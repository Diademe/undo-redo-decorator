import { Undoable } from "../src/index";
import { is_constructor } from "../src/utils";

describe("utils", () => {

    function decorator(title: string, expectedResult: boolean) {
        return (target: any, _: string): void => {
            test(title, () => {
                expect(is_constructor(target)).toBe(expectedResult);
            });
        };
    }

    @Undoable
    class Annotated {
        motherName: string;
        nonStatic: string;
        constructor() {
            this.motherName = "mother";
            this.nonStatic = "mother";
        }
        @decorator("annotated static function", true)
        static staticFunction() {
            return 1;
        }
        @decorator("annotated static member", true)
        static StaticMember() {
            return 1;
        }
        @decorator("annotated function", false)
        function() {
            return 1;
        }
        @decorator("annotated member", false)
        member() {
            return 1;
        }
    }

    class Unannotated {
        @decorator("unannotated static function", true)
        static staticFunction() {
            return 1;
        }
        @decorator("unannotated static member", true)
        static StaticMember() {
            return 1;
        }
        @decorator("unannotated function", false)
        function() {
            return 1;
        }
        @decorator("unannotated member", false)
        member() {
            return 1;
        }
    }

    test("is constructor", () => {
        // tslint:disable 
        expect(is_constructor(function(){ })).toBe(true);
        // tslint:enable
        expect(is_constructor(class A {})).toBe(true);
        expect(is_constructor(Array)).toBe(true);
        expect(is_constructor(Function)).toBe(true);
        expect(is_constructor(new Function())).toBe(true);
    });

    test("isn't constructor", () => {
        expect(is_constructor(undefined)).toBe(false);
        // tslint:disable-next-line:no-null-keyword
        expect(is_constructor(null)).toBe(false);
        expect(is_constructor(1)).toBe(false);
        // tslint:disable-next-line:no-construct
        expect(is_constructor(new Number(1))).toBe(false);
        expect(is_constructor(Array.prototype)).toBe(false);
        expect(is_constructor(Function.prototype)).toBe(false);
    });
});
