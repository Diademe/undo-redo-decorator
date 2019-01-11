# Undo Redo Decorator
This library is an attempt to offer an undo/redo mechanism as non-intrusive as possible. It needs ES6, and is not compatible with ES6 Map and Set (but provides alternatives)
To use it you need to do two steps:
- Decorate every class that you want to monitor with the `@Undoable()` decorator.
- Create an `const ud = UndoRedo()` object, and add all instances that you want to monitor.
  - `ud.save()` to set the current state as a milestone.
  - `ud.undo()` to go to the previous milestone.
  - `ud.redo()` to go to the next milestone.

## Example
  - Suppose instance of class A contains an instance of class B that contains an instance of class C
    1. If you want to monitor the member of class A, B and C, apply `@Undoable()` to A, B and C. Then add to UndoRedo the instance A only (all Undoable class are recursively initialized by Undoable).
    2. However if you what to monitor A and C only, as A doesn't have a member C, you need to add A and C to UndoRedo
    ```typescript
    @Undoable() class C { }
    @Undoable() class B { member: C; }
    @Undoable() class A { member: B; }
    // case 1
    const a = new A(); a.member = new B(); a.member.member = new C();
    const ud = new UndoRedo(a);
    // case 2
    const a = new A();
    const c = new C();
    const ud = new UndoRedo();
    ud.multiAdd([a, c]);
    ```


## Interface
The library exposes the following interface:

### Map and Set
The Es6 `Map` and `Set` are not supported by this library. Whoever, it is packed with two customs collection `Map` and `Set` (the typescript version of [collections-es6](https://github.com/rousan/collections-es6)) made compatible with this library.

### UndoDoNotTrack
Decorate members of a class that you don't want to track with the undo-redo.

### Undoable
This is a class decorator. You need to put it on classes that you want to monitor. As an optional argument, an array of string of non-enumerable property that you want to monitor. You should put the Undoable decorator at the top of the decorator stack:
```typescript
@Undoable()
@decorator1
@decorator2
class Foo {}
```
To monitor a member that is not [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties), add it in parameter to `@Undoable([/*non enumerable member*/])`.

### UndoAfterLoad
Decorate a method with `@UndoAfterLoad` to call it when an undo or a redo (ie a load) is being done. This method will be called as soon as each member of its class has been loaded. If there are circulars references, the time at which the method will be decorated is unspecified.

### UndoRedo
This is the class that will do the monitoring of whatever you want. You need to create an instance of UndoRedo, and register the instances of classes that you want to monitor.

|     Methods     |                                    Parameters                                   |
|----------------:|:--------------------------------------------------------------------------------|
| constructor     | watchable: an instance to monitor                                               |
| add             | watchable: an instance to monitor (save is made after the add)                  |
| multiAdd        | watchables: an array of instance to monitor (save is made after the add)        |
| save            | : set the current state as a milestone                                          |
| undo            | N?: revert to the previous milestone / go to Nth milestone (absolute)           |
| redo            | N?: revert to the next milestone / go to Nth milestone (absolute)               |
| getCurrentIndex | : return an integer N that can be given as parameter to go the the current state|
| undoPossible    | boolean. True if you can perform an undo                                        |
| redoPossible    | boolean. True if you can perform a redo                                         |
| maxRedoPossible | : return an integer that indicates who many redo you can perform.               |


## In depth

### Inheritance
Suppose instance of class A contains an instance of class B that contains an instance of class C.
In case of class B inherits from class A, you may only decorate B with `@Undoable()` and not A.
Static member are **not** inherited.

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

## Remark
- An object (class or instance) can be monitored only by one UndoRedo.
- Setter and Getter are not monitored, but the private variables used by the accessors are.
- Function are not monitored
- Non enumerable member are not monitored
- Non writable member are not monitored (but if it is a class decorated by Undoable, it's member will be monitored).

## Dirty side of undo-redo-proxy
We covered the API of undo-redo, let see who it work, and what can it break in your code.
1. Decorators: When you add `@Undoable()` on a class, the library will warp your class. You will use the wrapper without (hopefully) noticing anything. But unfortunately, class decorators are evaluated the last. If you used other decorators like member decorator of static decorator, they will see the real class, not the wrapper. In case you need access to the original class (not the wrapper), do the following `(MyClass as any).__originalConstructor__;`, or `(myInstance as any).constructor.__originalConstructor__;`.
2. For now, this library is not compatible with ES6 collections (Set, WeekSet, Map, WeekMap).

## Licence
MIT