# Undo Redo Decorator

This library is an attempt to offer an undo/redo mechanism as non-intrusive as possible.
To use it you need to do two steps:

- Decorates every class that you want to monitor with the `@Undoable()` decorator.
- Creates a `const ud = UndoRedo()` object, and add all instances that you want to monitor.
  - `ud.save()` to set the current state as a milestone.
  - `ud.undo()` to go to the previous milestone.
  - `ud.redo()` to go to the next milestone.

## Example

- Suppose instance of class A contains an instance of class B that contains an instance of class C
- If you want to monitor the member of class A, B and C, apply `@Undoable()` to A, B and C. Then add to UndoRedo the instance A only (all Undoable class are recursively initialized by Undoable).
- However if you want to monitor A and C only, as A doesn't have a member C, you need to add A and C to UndoRedo

    ```typescript
    @Undoable() class C {}
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

### UndoDoNotTrack

Decorates members of a class that you don't want to track with the undo-redo.

### UndoDoNotRecurs

Decorates members of a class that you want to track with the undo-redo, but not their children
(regardless of the children having the undoable decorator).

### Undoable

This is a class decorator. You need to put it on classes that you want to monitor. To monitor a member that is not [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties), add it in an optional string array parameter to `@Undoable([/*non enumerable member*/])`. You should put the Undoable decorator at the top of the decorator stack:

```typescript
@Undoable()
@decorator1
@decorator2
class Foo {}
```

### UndoAfterLoad

Decorates a method with `@UndoAfterLoad` to call it when an undo or a redo (ie a load) is being done. This method will be called as soon as each member of its class has been loaded. If there are circulars references, the time at which the method will be called is unspecified.

### UndoRedo

This is the class that will do the monitoring of whatever you want. You need to create an instance of UndoRedo, and register the instances of classes that you want to monitor.

|     Methods     |                                    Parameters                                   |
|----------------:|:--------------------------------------------------------------------------------|
| constructor     | watchable: an instance to monitor                                               |
| add             | watchable: an instance to monitor (save is made after the add)                  |
| multiAdd        | watchables: an array of instance to monitor (save is made after the add)        |
| save            | set the current state as a milestone                                            |
| undo            | N?: revert to the previous milestone / go to Nth milestone (absolute)           |
| redo            | N?: revert to the next milestone / go to Nth milestone (absolute)               |
| collapse        | N: collapse state up to N (ie merge last state to the state N)                  |
| getCurrentIndex | return an integer N that can be given as parameter to go to the current state   |
| undoPossible    | boolean. True if you can perform an undo                                        |
| redoPossible    | boolean. True if you can perform a redo                                         |
| maxRedoPossible | return an integer that indicates how many redo you can perform.                 |

#### setMaxHistorySize

By default, the history of the undo redo is infinity. You can set a limit the the size of history with `setMaxHistorySize(x)`.
If `x === 0`, then the history limit is set to infinity.
Else if `x >= 12`, each time the history size reach `x`, it is shrieked by 1/4 of `x`, by discarding olds values.
Otherwise, an exception is thrown. The limit of 12 is here to performance reason.

#### shallow save / undo / redo

```typescript
save(deepSave?: any[], shallowSave?: { [index: number]: any[]; }): number;
undo(index?: number, deepSave?: any[], shallowSave?: { [index: number]: any[]; }): void;
redo(index?: number, deepSave?: any[], shallowSave?: { [index: number]: any[]; }): void;
```

If `deepSave` is specified, the save will apply only on the object in the array `deepSave`, but UndoRedo will recurse on their property. If `deepSave` is not specified, the save will apply on the objects given with function `constructor`, `add`, `multiAdd`.
The values of the dictionary `shallowSave` will be saved with `index` level of recursion (`0` mean save the object, but no recursion);
Exemple f you want to undo only a specific object `obj` with 1 level of recursion, do the following:

```typescript
undo(undefined, [], {1: [obj]});
```

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

## Remark

- An object (class or instance) can be monitored only by one UndoRedo.
- Setter and Getter are not monitored, but the private variables used by the accessors are.
- Function are not monitored
- By default, non enumerable member are not monitored
- Non writable member are not monitored (but if it is a class decorated by Undoable, it's member will be monitored).

## Licence

MIT
