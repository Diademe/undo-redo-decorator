import { MasterIndex, __initialization__ } from "./core";

export { Undoable } from "./annotation";

export class UndoRedo<T extends Object> {
    private index: MasterIndex;
    constructor(private watchable?: T) {
        this.index = new MasterIndex();
        if (watchable) {
            this.internalAdd(watchable);
            this.index.save();
        }
    }
    private internalAdd(watchable?: T) {
        if (watchable && (watchable as any).__proxyInternal__) {
            __initialization__(watchable, this.index);
        }
        else {
            throw Error(`${watchable} is not decorated with @Undoable`);
        }
    }

    add(watchable?: T) {
        this.internalAdd(watchable);
        this.index.save();
    }

    multiAdd(watchables: T[]) {
        for (const watchable of watchables) {
            this.internalAdd(watchable)
        }
        this.index.save();
    }
    /**
     * save: the current state is saved
     * return true if there was something to save
     */
    public save(): boolean {
        return this.index.save();
    }

    /**
     * undo: go back to a previous saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number) {
        this.index.undo(index);
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        this.index.redo(index);
    }

    public getCurrentIndex(): number {
        return this.index.getCurrentIndex();
    }

    public undoPossible() {
        return this.index.undoPossible();
    }

    public redoPossible() {
        return this.index.redoPossible();
    }

    public maxRedoPossible() {
        return this.index.maxRedoPossible();
    }
}
