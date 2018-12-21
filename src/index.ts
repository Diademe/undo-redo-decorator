import { MasterIndex } from "./core";
import { Visitor } from "./type";

export { Undoable, UndoDoNotTrack } from "./annotation";
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
            this.index.saveInit();
            this.internalAdd(watchable);
            this.init();
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
        this.index.saveInit();
        this.internalAdd(watchable);
        this.init();
    }

    multiAdd(watchables: any[]) {
        this.index.saveInit();
        for (const watchable of watchables) {
            this.internalAdd(watchable)
        }
        this.init();
    }

    /**
     * save: the current state is saved
     * @returns the current index after the save
     */
    public save(): number {
        this.index.saveInit();
        for (const watchable of this.watchables) {
            watchable.__proxyInternal__.visit(Visitor.save, this.index, this.action++);
        }
        return this.index.getCurrentIndex();
    }

    /**
     * undo: go back to a previous saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number) {
        this.index.undo(index);
        this.index.loadInit();
        for (const watchable of this.watchables) {
            watchable.__proxyInternal__.visit(Visitor.load, this.index, this.action++);
        }
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        this.index.redo(index);
        this.index.loadInit();
        for (const watchable of this.watchables) {
            watchable.__proxyInternal__.visit(Visitor.load, this.index, this.action++);
        }
    }

    public getCurrentIndex(): number {
        return this.index.getCurrentIndex() ;
    }

    public undoPossible() {
        return this.index.getCurrentIndex() > 0;
    }

    public redoPossible() {
        return this.index.redoPossible();
    }

    public maxRedoPossible() {
        return this.index.maxRedoPossible();
    }
}
