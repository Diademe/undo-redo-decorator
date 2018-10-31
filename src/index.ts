import { MasterIndex, __initialization__, History } from "./core";

export { Undoable, cloneClass, cloneFunc } from "./annotation";
export { immutable } from "./immutable";
/**
 * todo improve sort and co
 */

export class UndoRedo<T extends Object> {
    private index: MasterIndex;
    private history: History<T>;
    constructor(private watchable: T, undoRedo?: UndoRedo<T>) {
        this.index =
            undoRedo && undoRedo instanceof UndoRedo
                ? (undoRedo as any).index
                : new MasterIndex();
        this.history =
            undoRedo && undoRedo instanceof UndoRedo
                ? (undoRedo as any).history
                : new History<T>(this.index, this.watchable);
        __initialization__(this.watchable, this.index);
        this.history.set(this.watchable);
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

    public get(): T {
        return this.history.get();
    }

    public maxRedoPossible() {
        return this.index.maxRedoPossible();
    }
}
