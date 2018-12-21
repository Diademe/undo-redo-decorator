import { SuperArray, Class } from "./type";
import { equality, notDefined } from "./utils";


export class History<T extends Class<any>, K extends keyof T> {
    private history: SuperArray<[number, T[K]]>;
    constructor(private masterIndex: MasterIndex, obj: T[K]) {
        this.history = new SuperArray<[number, T[K]]>();
        this.masterIndex.set(this.history, obj);
    }

    get(): T[K] {
        const index = this.masterIndex.get(this.history);
        if (index === -1) {
            // the object is not define for this state of undo
            return notDefined as any;
        }
        return this.history[index][1];
    }

    set(obj: T[K]): void {
        this.masterIndex.set(this.history, obj);
    }

    clone(): this {
        const res = Object.create(Object.getPrototypeOf(this));
        res.masterIndex = this.masterIndex;
        res.history = SuperArray.from(this.history);
        return res;
    }
}

/**
 * keep track of the history.
 */
export class MasterIndex {
    private currentIndex: number; // index pointing to the correct position in the history stack
    private maxIndex: number; // highest index reach by currentIndex (if there was undo)
    private isDirty: boolean;
    constructor() {
        this.currentIndex = -1;
        this.maxIndex = this.currentIndex;
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    public saveInit() {
        this.isDirty = false;
    }

    public init() {
        this.currentIndex = 0;
        this.maxIndex = 0;
    }

    /**
     * undo: go back to a previous saved state
     *  if index is defined, got to this state of history
     *  otherwise, go to the previous saved state
     * @param index to which state do you want to go (default : last saved state)
     */
    public undo(index?: number): void {
        // undefined because index can be 0
        index =
            index !== undefined
                ? index
                : Math.max(this.currentIndex - 1, 0);
        if (index > this.currentIndex || index < 0) {
            throw Error(
                "undo(i): i should be in [0, getCurrentIndex()] but i=" +
                    index +
                    " not in [0, " +
                    this.getCurrentIndex() +
                    "]"
            );
        }
        this.currentIndex = index;
    }

    public redoPossible() {
        return this.currentIndex < this.maxIndex;
    }

    public maxRedoPossible() {
        // -1 because branchHistory is initialized to [0]
        return this.maxIndex - this.currentIndex;
    }

    /**
     * redo: go a future saved state (possible after an undo)
     * @param index to which state do you want to go (default : last saved state)
     */
    public redo(index?: number): void {
        index = index !== undefined ? index : this.currentIndex + 1;
        if (
            index < this.currentIndex ||
            index > this.maxIndex
        ) {
            throw Error(
                "redo(i): i should be greater than getCurrentIndex() but i=" +
                    index +
                    " > " +
                    this.getCurrentIndex()
            );
        }
        this.currentIndex = Math.min(index, this.maxIndex);
    }

    private findIndex<T>(slaveHistory: SuperArray<[number, T]>) {
        if (slaveHistory.length === 0) {
            return -1;
        }
        const currentSlaveIndex = slaveHistory.reverseFindIndex(
            ([slaveIndex, obj]: [number, T]) =>
                slaveIndex <= this.currentIndex
            ,
            Math.min(this.currentIndex, slaveHistory.length - 1)
        );
        return currentSlaveIndex;
    }

    public set<T, K extends keyof T>(slaveHistory: SuperArray<[number, T[K]]>, obj: T[K]): void {
        const indexSlave = this.findIndex(slaveHistory);

        // remove redo history
        slaveHistory.length = indexSlave + 1;

        // we don't write twice an item at the end of the history
        if (slaveHistory.length > 0 && equality(slaveHistory[indexSlave][1], obj)) {
            return;
        }
        // slave index found but for an earlier version than master index
        slaveHistory.length++;
        if (!this.isDirty) {
            this.isDirty = true;
            this.currentIndex++;
            this.maxIndex = this.currentIndex;
        }
        slaveHistory.last = [this.currentIndex, obj];
    }

    /**
     * return the index of the current object
     * @param slaveHistory the history of the object from which we want to get the current state
     */
    public get<T>(slaveHistory: SuperArray<[number, T]>): number {
        return this.findIndex(slaveHistory);
    }
}
