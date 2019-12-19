import { MasterIndex } from "./core";
import { Visitor, ShallowSave } from "./type";
export { ShallowSave } from "./type";

export { Undoable, UndoDoNotTrack, UndoDoNotRecurs, UndoAfterLoad } from "./decorator";
export { Map } from "./collection/map";
export { Set } from "./collection/set";

export class UndoRedo {
    private index: MasterIndex;
    private watchables: any[] = [];
    private action = 0;
    private initialized = false;

    /**
     * ensure that the masterIndex has an index of 0;
     */
    private init() {
        if (!this.initialized) {
            this.initialized = true;
            this.index.init();
        }
    }

    constructor(watchable?: any) {
        this.index = new MasterIndex();
        if (watchable) {
            this.internalAdd(watchable);
            this.init();
        }
    }

    private internalAdd(watchable?: any): void {
        if (watchable && (watchable as any).__undoInternal__) {
            this.watchables.push(watchable);
            watchable.__undoInternal__.visit(Visitor.save, this.index, this.action++, -2);
        }
        else {
            throw Error(`${watchable} is not decorated with @Undoable()`);
        }
    }

    private computeMinIndex(maxHistorySize: number): void {
        if (maxHistorySize !== 0 && maxHistorySize < 8) {
            throw Error(`maxHistorySize (${maxHistorySize}) must be 0 or greater than 7`);
        }
        const indexSize = this.getCurrentIndex() - this.index.minIndex;
        if (indexSize > maxHistorySize) {
            this.index.minIndex = this.index.minIndex + maxHistorySize / 4; // discard 1/4 of old value
        }
    }

    public add(watchable?: any, replaceLastState = true): void {
        if (!replaceLastState) {
            this.index.saveInit();
        }
        this.internalAdd(watchable);
        this.init();
    }

    public multiAdd(watchables: any[], replaceLastState = true): void {
        if (!replaceLastState) {
            this.index.saveInit();
        }
        for (const watchable of watchables) {
            this.internalAdd(watchable)
        }
        this.init();
    }

    private applyAction(v: Visitor, deepSave?: any[], shallowSave: ShallowSave = {}): void {
        for (const watchable of deepSave ? deepSave : this.watchables) {
            watchable.__undoInternal__.visit(v, this.index, this.action++, -2);
        }
        for (const index in shallowSave) {
            for (const watchable of shallowSave[index]) {
                watchable.__undoInternal__.visit(v, this.index, this.action++, parseInt(index));
            }
        }
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

    public getCurrentIndex(): number {
        return this.index.getCurrentIndex() ;
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
    public setMaxHistorySize(x: number): void {
        if (x < 0) {
            throw new Error("the argument of setMaxHistorySize must be greater or equal to 0");
        }
        this.computeMinIndex(x === 0 ? Number.MAX_SAFE_INTEGER : x);
    }
}
