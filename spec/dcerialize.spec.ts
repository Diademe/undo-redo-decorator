import {
    deserializeAs,
    Deserialize,
    serializeAs,
    Serialize,
    inheritSerialization,
    RuntimeTypingResetDictionary,
    RuntimeTypingSetTypeString,
    RuntimeTypingSetEnable
} from "dcerialize";
import { Undoable, UndoableNoParent } from "../src";

describe("Dcerialize", () => {
    test("serialization", () => {
        @UndoableNoParent()
        class MemberTest {
            @serializeAs(() => Number)
            public member0 = 1;
        }

        @UndoableNoParent()
        class Test {
            @serializeAs(() => String)
            public value0 = "strvalue";
            @serializeAs(() => Boolean)
            public value1 = true;
            @serializeAs(() => Number)
            public value2 = 100;
            @serializeAs(() => MemberTest)
            public value3 = new MemberTest();
        }
        const target = new Test();
        const instance = Serialize(target, () => Test);
        expect(instance).toEqual({
            value0: "strvalue",
            value1: true,
            value2: 100,
            value3: {
                member0: 1
            }
        });
    });

    test("deserialization", () => {
        @UndoableNoParent()
        class MemberTest {
            @deserializeAs(() => Number)
            public member0 = 1;
        }

        @UndoableNoParent()
        class Test {
            @deserializeAs(() => String)
            public value0 = "strvalue";
            @deserializeAs(() => Boolean)
            public value1 = true;
            @deserializeAs(() => Number)
            public value2 = 100;
            @deserializeAs(() => MemberTest)
            public value3 = new MemberTest();
        }
        const target = new Test();
        const instance = Deserialize(
            {
                value0: "strvalue1",
                value1: false,
                value2: 101,
                value3: {
                    member0: 3
                }
            },
            () => Test,
            target
        );
        expect(instance.value0).toBe("strvalue1");
        expect(instance.value1).toBe(false);
        expect(instance.value2).toBe(101);
        expect(instance.value3.member0).toBe(3);
        expect(instance).toBeInstanceOf(Test);
        expect(instance.value3).toBeInstanceOf(MemberTest);
    });

    test("inheritance deserialization", () => {
        @UndoableNoParent()
        class Test {
            @deserializeAs(() => String)
            public value0 = "strvalue";
            @deserializeAs(() => Boolean)
            public value1 = true;
            @deserializeAs(() => Number)
            public value2 = 100;
        }

        @Undoable()
        @inheritSerialization(() => Test)
        class ChildTest extends Test {
            @deserializeAs(() => String)
            public value0 = "childStr";
            @deserializeAs(() => Number)
            public member0 = 1;
        }

        const instance = Deserialize(
            {
                value0: "strvalue2",
                value1: false,
                value2: 101,
                member0: 2
            },
            () => ChildTest
        );
        expect(instance.value0).toBe("strvalue2");
        expect(instance.value1).toBe(false);
        expect(instance.value2).toBe(101);
        expect(instance.member0).toBe(2);
    });

    test("runtime typing", () => {
        @UndoableNoParent()
        class Test0 {
            @deserializeAs(() => Boolean)
            public valueA = true;
        }
        @UndoableNoParent()
        class Test1 {
            @deserializeAs(() => Boolean)
            public valueB = true;
        }
        @inheritSerialization(() => Test1)
        @Undoable()
        class Test2 extends Test1 {}
        @UndoableNoParent()
        class Test3 {
            @deserializeAs(() => Object)
            public m1: Test0;
            @deserializeAs(() => Test2)
            public m2: Test1;
        }

        const s = new Test3();
        s.m1 = new Test0();
        s.m2 = new Test2();
        RuntimeTypingSetTypeString(Test0, "my Test0 type");
        RuntimeTypingSetTypeString(Test1, "my Test1 type");
        RuntimeTypingSetTypeString(Test2, "my Test2 type");
        RuntimeTypingSetTypeString(Test3, "my Test3 type");
        RuntimeTypingSetEnable(true);
        const json = Deserialize(
            {
                $type: "my Test3 type",
                m1: { $type: "my Test0 type", valueA: true },
                m2: { $type: "my Test2 type", valueB: true }
            },
            () => Test3
        );
        RuntimeTypingResetDictionary();
        RuntimeTypingSetEnable(false);
        expect(json instanceof Test3).toBeTruthy();
        expect(json.m1 instanceof Test0).toBeTruthy();
        expect(json.m2 instanceof Test1).toBeTruthy();
    });
});
