import { SuperArray, Index, Class } from "./type";


export class History<T extends Class<any>, K extends keyof T> {
    private history: SuperArray<[Index, T[K]]>;
    constructor(private masterIndex: MasterIndex, obj: T[K]) {
        this.history = new SuperArray<[Index, T[K]]>();
        this.masterIndex.set(this.history, obj);
    }

    get(): T[K] {
        const index = this.masterIndex.get(this.history);
        if (index === -1) {
            // the object is not define for this state of undo
            return undefined;
        }
        return this.history[index][1];
    }

    set(obj: T[K]): boolean {
        return this.masterIndex.set(this.history, obj);
    }

    clone(): this {
        const res = Object.create(Object.getPrototypeOf(this));
        res.masterIndex = this.masterIndex;
        res.history = SuperArray.from(this.history);
        return res;
    }
}

/**
 * State.Dirty : work in progress, not yet saved
 * State.Clean : no work done after the last save
 */
enum State {
    Dirty,
    Clean
}
/**
 * keep track of the history.
 */
export class MasterIndex {
    // History branch when a modification is done after an undo (it erase the redo history)
    private branchHistory: SuperArray<number>;
    private index: number;
    private lastRedo: number;
    constructor() {
        this.branchHistory = new SuperArray<number>();
        this.lastRedo = 0;
        this.branchHistory.push(this.lastRedo);
        this.index = 0;
    }

    public getCurrentIndex(): number {
        return this.index;
    }

    /**
     * save: the current state is saved
     * return true if there was something to save
     */
    public save(): void {
        console.info(`save (${this.getCurrentIndex()})`);
        this.branchHistory.push(this.lastRedo);
        this.index++;
    }

    /**
     * undo: go back to a previous saved state
     *  if index is defined, got to this state of history
     *  otherwise, if lastState === State.Dirty, got to the last saved state
     *  otherwise, go to the before last saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number): void {
        const log = this.getCurrentIndex();
        const redoVersion = this.lastRedo;
        // undefined because index can be 0
        index =
            index !== undefined
                ? index
                : Math.max(this.getCurrentIndex() - 1, 0);
        if (index > this.getCurrentIndex() || index < 0) {
            throw Error(
                "undo(i): i should be in [0, getCurrentIndex()] but i=" +
                    index +
                    " not in [0, " +
                    this.getCurrentIndex() +
                    "]"
            );
        }
        this.index = index;
        console.info(`undo (${log}-${redoVersion}, ${this.getCurrentIndex()}-${this.lastRedo})`);
    }

    public redoPossible() {
        // -1 because branchHistory is initialized to [0]
        return this.index < this.branchHistory.length - 1;
    }

    public maxRedoPossible() {
        // -1 because branchHistory is initialized to [0]
        return this.branchHistory.length - 1 - this.getCurrentIndex();
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        const log = this.getCurrentIndex()
        const redoVersion = this.lastRedo;
        index = index !== undefined ? index : this.getCurrentIndex() + 1;
        if (
            index <= this.getCurrentIndex() ||
            index >= this.branchHistory.length
        ) {
            throw Error(
                "redo(i): i should be in greater that getCurrentIndex() but i=" +
                    index +
                    " > " +
                    this.getCurrentIndex()
            );
        }
        this.index = Math.min(index, this.branchHistory.length - 1);
        console.info(`redo (${log}-${redoVersion}, ${this.getCurrentIndex()}-${this.lastRedo})`);
    }

    private findIndex<T>(slaveIndexHistory: SuperArray<[Index, T]>) {
        if (slaveIndexHistory.length === 0) {
            return -1;
        }

        const slaveLastRedo = slaveIndexHistory.last[0].redoVersion;

        const iMaster = this.branchHistory.reverseFindIndex(
            (masterRedoVersion: number) => {
                return masterRedoVersion <= slaveLastRedo;
            },
            this.index
        );
        const indexMaster = new Index(iMaster, this.branchHistory[iMaster]);
        const iSlave = slaveIndexHistory.reverseFindIndex(([indexSlave, _]) => {
            return indexSlave.before(indexMaster) <= 0;
        });
        return iSlave;
    }

    public clearRedo() {
        if (this.redoPossible()) {
            // parent node: index from which we branch
            this.branchHistory.length = this.index + 1;
            this.lastRedo = this.lastRedo + 1;
        }
    }

    /**
     * call this function each time
     * @param slaveIndexHistory
     */
    public set<T, K extends keyof T>(slaveIndexHistory: SuperArray<[Index, T[K]]>, obj: T[K]): boolean {
        if (this.redoPossible()) {
            // parent node: index from which we branch
            this.branchHistory.length = this.index + 1;
            this.lastRedo = this.lastRedo + 1;
        }

        const iSlave = this.findIndex(slaveIndexHistory);
        slaveIndexHistory.length = iSlave + 1;
        // we don't write twice an item at the end of the history
        if (slaveIndexHistory.length > 0 && slaveIndexHistory.last[1] === obj) {
            return false;
        }
        // no index found, create a new array of length 1
        if (iSlave === -1) {
            slaveIndexHistory.length = 1;
        }
        // slave index found but for an earlier version than master index
        else if (slaveIndexHistory.last[0].indexVersion < this.index) {
            slaveIndexHistory.length++;
        }
        // slave index found, same as master index, rewrite to of the slaveIndexHistory
        else {
            slaveIndexHistory.length = iSlave + 1;
        }
        slaveIndexHistory.last = [new Index(this.index, this.lastRedo), obj];
        return true;
    }

    public get<T>(slaveIndexHistory: SuperArray<[Index, T]>): number {
        return this.findIndex(slaveIndexHistory);
    }
}
