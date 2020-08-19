import { UndoInternalInformation, initUndoInternalInformation } from "./undoInternal";
import { Key, Class } from "./type";


/**
 * property decorator. Property decorated will not be monitored by Undo Redo.
 */
export function UndoDoNotTrack(target: any, propKey: Key): void {
    if (typeof target[propKey] === "function") {
        console.warn("UndoDoNotTrack is unnecessary on function as they are not monitored by Undo Redo");
    }
    else {
        initUndoInternalInformation(target.constructor);
        (target.constructor.prototype.__undoInternalInformation__ as UndoInternalInformation).doNotTrack.add(propKey);
    }
}

/**
 * property decorator. Property decorated will be monitored by Undo Redo, but that wont propagate the recursion.
 * it can be used to flatten the recursion tree.
 */
export function UndoDoNotRecurs(target: any, propKey: Key): void {
    if (typeof target[propKey] === "function") {
        console.warn("UndoDoNotRecurs is unnecessary on function as they are not monitored by Undo Redo");
    }
    else {
        initUndoInternalInformation(target.constructor);
        (target.constructor.prototype.__undoInternalInformation__ as UndoInternalInformation).doNotRecurs.add(propKey);
    }
}

/**
 * Function decorator. Function decorated will be executed after each redo and after each undo.
 */
export function UndoAfterLoad(target: any, propKey: Key): void {
    if (typeof target[propKey] === "function") {
        initUndoInternalInformation(target.constructor);
        (target.constructor.prototype.__undoInternalInformation__ as UndoInternalInformation).afterLoad.add(propKey);
    }
    else {
        console.warn(`AfterLoad is applied to the property ${propKey as string}, but ${propKey as string} is not a function`);
    }
}

/**
 * class decorator
 * @param forceWatch array of non enumerable member to watch
 */
export function Undoable(
    forceWatch: Key[] = []
) {
    return <T>(baseCtor: Class<T>) => {
        // in case no decorator were applied, we must create `__undoInternalInformation__`
        initUndoInternalInformation(baseCtor);
        // set non enumerables members that UndoRedo should watch.
        (baseCtor.prototype.__undoInternalInformation__ as UndoInternalInformation).
            addNonEnumerables(forceWatch);
    };
}
