export class History<T> extends Array<T> {
    constructor() {
        super();
    }
    public last() {
        return this[this.length - 1];
    }

    public reverseFindIndex(f: (elt: T, index: number, history: History<T>) => boolean): number {
        for (let index = this.length - 1; index >= 0; index--) {
            if (f(this[index], index, this)) {
                return index;
            }
        }
        return -1;
    }
}

export class Index {
    constructor(public indexVersion: number, public redoVersion: number) {
    }
    /**
     * this.before(that)
     *   -1 if this before that
     *   0 if this == that
     *   1 if this after that
     */
    before(that: Index): number {
        if (this.redoVersion < that.redoVersion) { return -1; }
        if (this.redoVersion === that.redoVersion) { return this.indexVersion - that.indexVersion; }
        return 1;
    }
}

/**
 * State.Dirty : work in progress, not yet saved
 * State.Clean : no work done after the last save
 */
enum State { Dirty, Clean }
/**
 * keep track of the history.
 */
export class MasterIndex {
    // History branch when a modification is done after an undo (it erase the redo history)
    private branchHistory: History<number>;
    private index: number;
    private lastState: State;
    private lastRedo: number;
    constructor() {
        this.branchHistory = new History<number>();
        this.lastRedo = 0;
        this.branchHistory.push(this.lastRedo);
        this.index = 0;
        this.lastState = State.Clean;
    }

    public getCurrentIndex(): number {
        return this.lastState === State.Dirty ? this.index + 1 : this.index;
    }

    /**
     * save: the current state is saved
     * return true if there was something to save
     */
    public save(): boolean {
        if (this.lastState === State.Dirty) {
            this.lastState = State.Clean;
            this.branchHistory.push(this.lastRedo);
            this.index++;
            return true;
        }
        return false;
    }

    public undoPossible() {
        return this.getCurrentIndex() > 0;
    }

    /**
     * undo: go back to a previous saved state
     *  if index is defined, got to this state of history
     *  otherwise, if lastState === State.Dirty, got to the last saved state
     *  otherwise, go to the before last saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number): void {
        let _index = index !== undefined ? index : this.index - 1;
        if (this.lastState === State.Dirty && index === undefined) {
            _index++;
        }
        this.index = Math.max(_index, 0);
        this.lastState = State.Clean;
    }

    public redoPossible() {
        return this.index < this.branchHistory.length - 1;
    }

    /**
     * redo: go a futur saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        index = index || this.index + 1;
        this.index = Math.min(index, this.branchHistory.length - 1);
        this.lastState = State.Clean;
    }

    /**
     * call this function each time
     * @param slaveIndexHistory
     */
    public set<T>(slaveIndexHistory: History<[Index, T]>, obj: T): void {
        if (this.redoPossible()) {
            // parent node: index from which we branche
            this.branchHistory.length = this.index + 1;
            this.lastRedo = this.lastRedo + 1;
        }
        this.lastState = State.Dirty;
        const slaveLastRedo = slaveIndexHistory.last()[0].redoVersion;

        const iMaster = this.branchHistory.reverseFindIndex((masterRedoVersion: number) => {
            return masterRedoVersion <= slaveLastRedo;
        });
        const indexMaster = new Index(iMaster, this.branchHistory[iMaster]);
        const iSlave = slaveIndexHistory.reverseFindIndex(([indexSlave, _]) => {
            return indexSlave.before(indexMaster) <= 0;
        });
        slaveIndexHistory.length = iSlave + 1;
        slaveIndexHistory.push([new Index(this.index + 1, this.lastRedo), obj]);
    }
}

export class UndoRedo<T extends Object> {
    private index: MasterIndex;
    constructor(private watchable: T) {

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
    public undo() {
        this.index.undo();
    }

    /**
     * redo: go a futur saved state (possible after an undo)
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
}

/**
 * TODO :
 * 1 - provide an optional new decorator to clone an object
 * 2 - deal with the index in case of an undo (tuple ?)
 * 3 - hidden method to set UndoRedo in proxy (Symbole)
 */