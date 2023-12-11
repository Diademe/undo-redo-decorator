import { MasterIndex } from "./core";
import { Visitor, ShallowSave, UndoRedoError } from "./type";
import { hasUndoInternal, UndoInternal, hasUndoInternalInformation, HasUndoInternal } from "./undo-internal";
import { equality as defaultEquality } from "./utils";
export { ShallowSave, UndoRedoError } from "./type";
export { Undoable, UndoDoNotTrack, UndoDoNotRecurs, UndoAfterLoad } from "./decorator";


export class InvalidParameterError extends UndoRedoError {}

/**
 * class used as entry point for the user.
 */
export class UndoRedo {
    /** The core of UndoRedo, an object can be affected to only one MasterIndex */
    private index: MasterIndex;
    private watchables: any[] = [];
    /** the current action being processed */
    private action = 0;
    private initialized = false;

    /**
     * ensure that the masterIndex has an index of 0.
     */
    private init() {
        if (!this.initialized) {
            this.initialized = true;
            this.index.init();
        }
    }

    constructor(watchable?: any) {
        this.index = new MasterIndex(defaultEquality);
        if (watchable) {
            this.internalAdd(watchable);
            this.init();
        }
    }

    private internalAdd(watchable?: any): void {
        if (hasUndoInternalInformation(watchable)) {
            if (!hasUndoInternal(watchable)) {
                this.watchables.push(watchable);
                UndoInternal.Initialize(watchable);
            }
            (watchable as HasUndoInternal).__undoInternal__.visit(Visitor.save, this.index, this.action++, -2);
        }
        else {
            throw new UndoRedoError(`${watchable} is not decorated with @Undoable()`);
        }
    }

    private computeMinIndex(maxHistorySize: number): void {
        if (maxHistorySize !== 0 && maxHistorySize < 8) {
            throw new InvalidParameterError(`maxHistorySize (${maxHistorySize}) must be 0 or greater than 7`);
        }
        const indexSize = this.getCurrentIndex() - this.index.minIndex;
        if (indexSize > maxHistorySize) {
            this.index.minIndex = this.index.minIndex + maxHistorySize / 4; // discard 1/4 of old value
        }
    }

    /**
     * add a watchable.
     * @param watchable the watchable to be added to this UndoRedo.
     * @param replaceLastState if true, the current state of the UndoRedo will be overridden.
     */
    public add(watchable?: any, replaceLastState = true): void {
        if (!replaceLastState) {
            this.index.saveInit();
        }
        this.internalAdd(watchable);
        this.init();
    }

    /**
     * add a list of watchable
     * @param watchables watchables to be added to this UndoRedo.
     * @param replaceLastState if true, the current state of the UndoRedo will be overridden.
     */
    public multiAdd(watchables: any[], replaceLastState = true): void {
        if (!replaceLastState) {
            this.index.saveInit();
        }
        for (const watchable of watchables) {
            this.internalAdd(watchable);
        }
        this.init();
    }

    private applyAction(visitor: Visitor, deepSave?: any[], shallowSave: ShallowSave = {}): void {
        for (const watchable of deepSave ?? this.watchables) {
            if (hasUndoInternalInformation(watchable)) {
                if (!hasUndoInternal(watchable)) {
                    UndoInternal.Initialize(watchable);
                }
                (watchable as HasUndoInternal).__undoInternal__.visit(visitor, this.index, this.action, -2);
            }
            else {
                throw new InvalidParameterError(`${watchable} is not decorated with @Undoable()`);
            }
        }
        for (const index in shallowSave) {
            for (const watchable of shallowSave[index]) {
                if (hasUndoInternalInformation(watchable)) {
                    if (!hasUndoInternal(watchable)) {
                        UndoInternal.Initialize(watchable);
                    }
                    (watchable as HasUndoInternal).__undoInternal__.visit(visitor, this.index, this.action, Number.parseInt(index));
                }
                else {
                    throw new InvalidParameterError(`${watchable} is not decorated with @Undoable()`);
                }
            }
        }
        this.action++;
    }

    /**
     * save: the current state is saved
     * @returns the current index after the save
     */
    public save(deepSave?: any[], shallowSave?: ShallowSave): number {
        this.index.saveInit();
        this.applyAction(Visitor.save, deepSave, shallowSave);
        return this.index.getCurrentIndex();
    }

    /**
     * undo: go back to a previous saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number, deepSave?: any[], shallowSave?: ShallowSave) {
        this.index.undo(index);
        this.index.loadInit();
        this.applyAction(Visitor.load, deepSave, shallowSave);
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number, deepSave?: any[], shallowSave?: ShallowSave): void {
        this.index.redo(index);
        this.index.loadInit();
        this.applyAction(Visitor.load, deepSave, shallowSave);
    }

    /**
     * merge history from now to index
     * @param index collapse to this index (if `index` > current Index, then curent index become index)
     */
    public collapse(index: number, deepSave?: any[], shallowSave?: ShallowSave): number {
        this.index.collapseInit(index);
        this.index.loadInit();
        this.applyAction(Visitor.collapse, deepSave, shallowSave);
        this.index.collapseDone(index);
        // else collapse to the current step, noting to do
        return this.index.getCurrentIndex();
    }

    public getCurrentIndex(): number {
        return this.index.getCurrentIndex();
    }

    public undoPossible(): boolean {
        return this.index.getCurrentIndex() > 0;
    }

    public redoPossible(): boolean {
        return this.index.redoPossible();
    }

    public maxRedoPossible(): number {
        return this.index.maxRedoPossible();
    }

    /**
     * set History size, 0 = no limit (default)
     * if history reach this size, 1/4 of the old elements will be discarded
     */
    public setMaxHistorySize(size: number): void {
        if (size < 0) {
            throw new InvalidParameterError(`the argument (${size}) of setMaxHistorySize must be greater or equal to 0`);
        }
        this.computeMinIndex(size === 0 ? Number.MAX_SAFE_INTEGER : size);
    }

    /**
     * lazy clear of hold history
     * holderThanIndex >= 0
     */
    public clearHistory(olderThanIndex: number): void {
        if (olderThanIndex < 0) {
            throw new InvalidParameterError(`the argument (${olderThanIndex}) of clearHistory must be greater or equal to 0`);
        }
        this.index.minIndex = olderThanIndex;
    }
}
