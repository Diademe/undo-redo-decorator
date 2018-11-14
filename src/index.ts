import { MasterIndex, __initialization__ } from "./core";

export { Undoable, UndoInit } from "./annotation";
export { Map } from "./collection/map";
export { Set } from "./collection/set";

export class UndoRedo {
    private index: MasterIndex;
    private inited = false;
    constructor(private watchable?: any) {
        this.index = new MasterIndex();
        if (watchable) {
            this.internalAdd(watchable);
            this.index.save();
            this.inited = true;
        }
    }

    private internalAdd(watchable?: any) {
        if (watchable && (watchable as any).__proxyInternal__) {
            __initialization__(watchable, this.index);
        }
        else {
            throw Error(`${watchable} is not decorated with @Undoable()`);
        }
    }

    add(watchable?: any) {
        this.internalAdd(watchable);
        this.index.save();
        this.inited = true;
    }

    multiAdd(watchables: any[]) {
        for (const watchable of watchables) {
            this.internalAdd(watchable)
        }
        this.index.save();
        this.inited = true;
    }
    /**
     * save: the current state is saved
     * return true if there was something to save
     */
    public save(): boolean {
        console.log("save:", this.getCurrentIndex());
        return this.index.save();
    }

    /**
     * undo: go back to a previous saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number) {
        if (this.inited) {
            this.index.undo(index ? index + 1 : index);
            console.log("undo:", this.getCurrentIndex());
        }
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        if (this.inited) {
            this.index.redo(index ? index + 1 : index);
            console.log("redo:", this.getCurrentIndex());
        }
    }

    public getCurrentIndex(): number {
        return this.inited ? this.index.getCurrentIndex() - 1 : undefined;
    }

    public undoPossible() {
        if (this.inited) {
            return this.index.getCurrentIndex() > 1;
        }
        return false;
    }

    public redoPossible() {
        return this.inited ? this.index.redoPossible() : false;
    }

    public maxRedoPossible() {
        return this.index.maxRedoPossible();
    }
}
