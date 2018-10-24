
import { SuperArray, Index } from "./type";

export function __initialization__(proxy: any, masterIndex: MasterIndex) {
    if (proxy.__proxy__) {
        if (proxy.__master__ !== masterIndex) {
            proxy.__master__ = masterIndex;
            proxy.__init__();
            Object.keys(proxy).forEach(member => {
                __initialization__(proxy[member], masterIndex);
            });
            Object.keys(proxy.constructor).forEach(member => {
                __initialization__(proxy.constructor[member], masterIndex);
            });
            if (
                [Array, Map, Set].some(
                    collection => proxy instanceof collection
                )
            ) {
                [...proxy.entries()].forEach(([_, val]) =>
                    __initialization__(val, masterIndex)
                );
            }
        }
    }
}

        }
        return 1;
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
    private lastState: State;
    private lastRedo: number;
    constructor() {
        this.branchHistory = new SuperArray<number>();
        this.lastRedo = 0;
        this.branchHistory.push(this.lastRedo);
        this.index = 0;
        this.lastState = State.Clean;
    }

    public getCurrentIndex(): number {
        return this.index;
    }

    /**
     * save: the current state is saved
     * return true if there was something to save
     */
    public save(): boolean {
        if (this.lastState === State.Dirty) {
            this.lastState = State.Clean;
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
        // undefined because index can be 0
        index =
            index !== undefined
                ? index
                : Math.max(this.getCurrentIndex() - 1, 0);
        if (index >= this.getCurrentIndex() || index < 0) {
            throw Error(
                "undo(i): i should be in [0, getCurrentIndex()] but i=" +
                    index +
                    " not in [0, " +
                    this.getCurrentIndex() +
                    "]"
            );
        }
        this.index = index;
        this.lastState = State.Clean;
    }

    public redoPossible() {
        // -1 because branchHistory is initialized to [0]
        return this.index < this.branchHistory.length - 1;
    }

    public maxRedoPossible() {
        // -1 because branchHistory is initialized to [0]
        return this.branchHistory.length - 1;
    }

    /**
     * redo: go a futur saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
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
        this.lastState = State.Clean;
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

    /**
     * call this function each time
     * @param slaveIndexHistory
     */
    public set<T>(slaveIndexHistory: SuperArray<[Index, T]>, obj: T): void {
        if (this.redoPossible()) {
            // parent node: index from which we branche
            this.branchHistory.length = this.index + 1;
            this.lastRedo = this.lastRedo + 1;
        }
        if (this.lastState === State.Clean) {
            this.branchHistory.push(this.lastRedo);
            this.index++;
        }
        const iSlave = this.findIndex(slaveIndexHistory);
        slaveIndexHistory.length = iSlave + 1;
        // we don't write twice an item at the end of the history
        if (slaveIndexHistory.length > 0 && slaveIndexHistory.last[1] === obj) {
            if (this.lastState === State.Clean) {
                this.branchHistory.pop();
                this.index--;
            }
            return;
        }
        slaveIndexHistory.length = iSlave === -1 ? 1 : iSlave + 2;
        this.lastState = State.Dirty;
        slaveIndexHistory.last = [new Index(this.index, this.lastRedo), obj];
    }

    public get<T>(slaveIndexHistory: SuperArray<[Index, T]>): number {
        return this.findIndex(slaveIndexHistory);
    }
}

export class UndoRedo<T extends Object> {
    private index: MasterIndex;
    constructor(private watchable: T) {}
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
