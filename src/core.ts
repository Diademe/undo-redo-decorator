import { SuperArray, Class } from "./type";
import { equality, notDefined } from "./utils";


export class History<T extends Class<any>, K extends keyof T> {
    private history: SuperArray<[number, T[K] | Symbol]>;
    constructor(private masterIndex: MasterIndex, obj: T[K]) {
        this.history = new SuperArray<[number, T[K]]>([0, notDefined]);
        this.masterIndex.set(this.history, obj);
    }

    get(): T[K] | Symbol {
        const index = this.masterIndex.get(this.history);
        if (index === -1) {
            // the object is not define for this state of undo
            return notDefined as any;
        }
        return this.history[index][1];
    }

    set(obj: T[K] | Symbol): void {
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
        this.currentIndex = 0;
        this.maxIndex = this.currentIndex;
        this.isDirty = true;
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    public saveInit() {
        this.isDirty = false;
    }

    public loadInit() {
        this.isDirty = true;
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

    /**
     * @returns index where a value must be written for currentIndex
     * @param slaveHistory must not be empty
     */
    private findIndex<T>(slaveHistory: SuperArray<[number, T]>) {
        return slaveHistory.reverseFindIndex(
            ([slaveIndex]: [number, T]) =>
                slaveIndex <= this.currentIndex
        );
    }

    /**
     * @param slaveHistory the history where obj should be saved
     * must not be empty (initialize it with [0, notDefined])
     * @param obj the object to save in slaveHistory
     */
    public set<T, K extends keyof T>(slaveHistory: SuperArray<[number, T[K] | Symbol]>, obj: T[K] | Symbol): void {
        const indexSlaveHistory = this.findIndex(slaveHistory);

        // we don't write twice an item at the end of the history
        if (equality(slaveHistory[indexSlaveHistory][1], obj)) {
            return;
        }

        // remove redo history
        slaveHistory.length = indexSlaveHistory + 1;

        if (!this.isDirty) {
            // last save was before currentIndex, last value should not be overwritten
            this.isDirty = true;
            this.currentIndex++;
            this.maxIndex = this.currentIndex;
        }

        if (slaveHistory[indexSlaveHistory][0] < this.currentIndex) {
            slaveHistory.length++;
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
