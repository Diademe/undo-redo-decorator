# Undo Redo Proxy
This library is an attempt to offer an undo/redo mechanism as non-intrusive as possible. It needs ES6, and is not compatible with ES6 Map and Set (but provides alternatives)
To use it you need to do two steps:
- Decorate every class that you want to monitor with the `@Undoable()` decorator.
- Create an `const ud = UndoRedo()` object, and add all instances that you want to monitor.
  - `ud.save()` to set the current state as a milestone.
  - `ud.undo()` to go to the previous milestone.
  - `ud.redo()` to go to the next milestone.

## Example
  - Suppose instance of class A contains an instance of class B that contains an instance of class C
    1. If you want to monitor the member of class A, B and C, apply `@Undoable()`, and add to UndoRedo the instance A only (all Undoable class are recursively initialized by Undoable).
    2. However if you what to monitor A and C only, as A doesn't have a member C, you need to add A and C to UndoRedo
    ```typescript
    @Undoable() class C { }
    @Undoable() class B { member: C; }
    @Undoable() class A { member: B; }
    const a = new A(); a.member = new B(); a.member.member = new C();
    const ud = new UndoRedo();
    // case 1
    ud.add(a);
    // case 2
    ud.multiAdd([a, c]);
    ```


## Interface
The library exposes 4 classes:

### Map and Set
The Es6 Map and Set are not supported by this library. Whoever, it is packed with two customs collection Map and Set (the typescript version of [collections-es6](https://github.com/rousan/collections-es6)) that are compatible with this library.

### Undoable
This is a class decorator. You need to put it on classes that you want to monitor. As an optional argument, an array of string of non-enumerable property that you want to monitor. You should put the Undoable decorator at the top of the decorator stack:
```typescript
@Undoable()
@decorator1
@decorator2
class Foo {}
```
To monitor a member that is not [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties), add it in parameter to `@Undoable([/*non enumerable member*/])`.

### UndoRedo
This is the class that will do the monitoring of whatever you want. You need to create an instance of UndoRedo, and register the instances of classes that you want to monitor.

|     Methods     |                                    Parameters                                   |
|----------------:|:--------------------------------------------------------------------------------|
| constructor     | watchable: an instance to monitor                                               |
| add             | watchable: an instance to monitor                                               |
| multiAdd        | watchables: an array of instance to monitor                                     |
| save            | : set the current state as a milestone                                          |
| undo            | N: revert to the previous milestone                                             |
| redo            | N: revert to the next milestone                                                 |
| getCurrentIndex | : return an integer N that can be given as parameter to go the the current state|
| undoPossible    | boolean. True if you can perform an undo                                        |
| redoPossible    | boolean. True if you can perform a redo                                         |
| maxRedoPossible | : return an integer that indicates who many redo you can perform.               |


## In depth

### Inheritance
Suppose instance of class A contains an instance of class B that contains an instance of class C.
In case of class B inherits from class A, you may only decorate B with `@Undoable()` and not A.

### Array
To monitor an array, you need to subclass it:
```typescript
@Undoable()
class MyArray extends Array {}
```
and use MyArray.

### Static
If you want to monitor a static variable, you need to add the class to UndoRedo:
```typescript
@Undoable() class A { static member = 1; }
const ud = new UndoRedo();
ud.add(A);
```

### Accessors
Setter and Getter are not monitored, but the private variables used by the accessors are.


## Dirty side of undo-redo-proxy
We covered undo and redo, why *proxy*? The whole library is based on [proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) and [decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).
1. Decorators: When you add `@Undoable()` on a class, the library will warp your class. You will use the wrapper without (hopefully) noticing anything. But unfortunately, class decorators are evaluated the last. If you used other decorators like member decorator of static decorator, they will see the real class, not the wrapper. It can cause problems if the use the class as in index of a Map or Set because after the evaluation of those decorators, the class will be overwritten. In case you need access to the original class (not the wrapper), do the following `(MyClass as any).__originalConstructor__;`, or `(myInstance as any).constructor.__originalConstructor__;`.
2. Proxy: proxy allow to monitor every access to an object (class or instance). The library saves every write access to be able to udo or restore the state of the object. But they are incompatible with ES6 Map and Set.

## Troubleshooting
- An object can't be in two UndoRedo. the last one takes precedence;
- If you use other decorators:
  - Place `@Undoable()` at the top of the stack of class decorator
  - If you need to access the type/constructor of an instance of a class with `@Undoable()`, do the following `(MyClass as any).__originalConstructor__;`, or `(myInstance as any).constructor.__originalConstructor__;`. This is because the `@Undoable()` decorator redefine the type of the class on which it is applied. But the non class decorators are executed before, and the use the original type (not the one modified by `@Undoable()`).
- You can't do `UndoRedo.add(this)` from the constructor of a decorated class (`this` in constructor correspond to the original class and not the wrapper).

## Licence
MIT