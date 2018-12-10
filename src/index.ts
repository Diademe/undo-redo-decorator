import { MasterIndex } from "./core";
import { Visitor } from "./type";

export { Undoable, UndoDoNotTrack } from "./annotation";
export { Map } from "./collection/map";
export { Set } from "./collection/set";

export class UndoRedo {
    private index: MasterIndex;
    private ignited = false;
    private watchables: any[] = [];
    private action = 0;
    constructor(watchable?: any) {
        this.index = new MasterIndex();
        if (watchable) {
            this.index.save();
            this.internalAdd(watchable);
            this.ignited = true;
        }
    }

    private internalAdd(watchable?: any) {
        if (watchable && (watchable as any).__proxyInternal__) {
            this.watchables.push(watchable);
            watchable.__proxyInternal__.visit(Visitor.save, this.index, this.action++);
        }
        else {
            throw Error(`${watchable} is not decorated with @Undoable()`);
        }
    }

    add(watchable?: any) {
        this.index.save();
        this.internalAdd(watchable);
        this.ignited = true;
    }

    multiAdd(watchables: any[]) {
        this.index.save();
        for (const watchable of watchables) {
            this.internalAdd(watchable)
        }
        this.ignited = true;
    }

    /**
     * save: the current state is saved
     */
    public save(): void {
        this.index.save();
        let saved = false; // saved === true if some data has changed
        for (const watchable of this.watchables) {
            saved = watchable.__proxyInternal__.visit(Visitor.save, this.index, this.action++) || saved;
        }
        if (saved === false) { // cancel the increment of index to avoid empty save
            this.index.undo();
        }
    }

    /**
     * undo: go back to a previous saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number) {
        if (this.ignited) {
            this.index.undo(index !== undefined ? index + 1 : index);
            for (const watchable of this.watchables) {
                watchable.__proxyInternal__.visit(Visitor.load, this.index, this.action++);
            }
        }
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        if (this.ignited) {
            this.index.redo(index !== undefined ? index + 1 : index);
            for (const watchable of this.watchables) {
                watchable.__proxyInternal__.visit(Visitor.load, this.index, this.action++);
            }
        }
    }

    public clearRedo() {
        this.index.clearRedo();
    }

    public getCurrentIndex(): number {
        return this.ignited ? this.index.getCurrentIndex() - 1 : undefined;
    }

    public undoPossible() {
        if (this.ignited) {
            return this.index.getCurrentIndex() > 1;
        }
        return false;
    }

    public redoPossible() {
        return this.ignited ? this.index.redoPossible() : false;
    }

    public maxRedoPossible() {
        return this.index.maxRedoPossible();
    }
}
