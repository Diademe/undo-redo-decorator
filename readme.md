# Undo Redo Proxy

## troubleshooting
- An object can't be in two history;
- if you use other decorators:
  - place @Undoable at the top of the pile of class decorator
  - if you need to access the type/constructor of an instance of a class with @Undoable, do the following `(instance as any).__originalConstructor__;`. This is because the @Undoable decorator redefine the type of the class on which it is applied. But the non class decorators are executed before, and the use the original type (not the one modified by @Undoable).

## Licence
MIT