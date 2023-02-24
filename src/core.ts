import { UndoRedoError } from "./type";
import { equality, notDefined, reverseFindIndex } from "./utils";

/**
 * keep track of the history.
 */
export class MasterIndex {
    public minIndex: number; // during a set, discard element with index lower than minIndex
    private currentIndex: number; // index pointing to the correct position in the history stack
    private maxIndex: number; // highest index reach by currentIndex (if there was undo)
    private isDirty: boolean;

    constructor() {
        this.currentIndex = 0;
        this.minIndex = 0;
        this.maxIndex = this.currentIndex;
        this.isDirty = true;
    }

    public collapseInit(collapseTo: number): void {
        this.currentIndex = collapseTo;
    }

    public collapseDone(collapseTo: number): void {
        this.maxIndex = collapseTo;
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
        index = index ?? Math.max(this.currentIndex - 1, 0);
        if (index > this.currentIndex || index < 0) {
            throw new UndoRedoError(
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
        index = index ?? this.currentIndex + 1;
        if (
            index < this.currentIndex ||
            index > this.maxIndex
        ) {
            throw new UndoRedoError(`redo(i): i (${index}) should be greater than getCurrentIndex() (${this.getCurrentIndex()}) `);
        }
        this.currentIndex = Math.min(index, this.maxIndex);
    }

    /**
     * @returns index where a value must be written for currentIndex
     * @param slaveHistory must not be empty
     */
    private findIndex<T>(slaveHistory: [number, T][]) {
        return reverseFindIndex(
            slaveHistory,
            ([slaveIndex]: [number, T]) => slaveIndex <= this.currentIndex
        );
    }

    /**
     * @returns first index where value is not noDefined
     * @param slaveHistory must not be empty
     */
    private findCreationIndex<T>(slaveHistory: [number, T][]) {
        const index = slaveHistory.findIndex(([, obj]: [number, T]) => obj !== notDefined);
        return index === -1 ? -1 : slaveHistory[index][0];
    }

    /** delete history if it is created in the future */
    public trimFutureHistory(slaveHistory: [number, unknown | Symbol][], ): void {
        const indexCreation = this.findCreationIndex(slaveHistory);
        if (this.isDirty && indexCreation >= this.currentIndex) {
            slaveHistory.length = 0;
            slaveHistory.push([indexCreation, notDefined]);
            return;
        }
    }

    /**
     * @param slaveHistory the history where obj should be saved
     * must not be empty (initialize it with [0, notDefined])
     * @param obj the object to save in slaveHistory
     */
    public set(slaveHistory: [number, unknown | Symbol][], obj: unknown | Symbol): void {
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
        slaveHistory[slaveHistory.length - 1] = [this.currentIndex, obj];

        // remove old entry
        if (slaveHistory.length > 1 && slaveHistory[1][0] < this.minIndex) {
            // the range [1, indexHoldHistory - 1] will be removed from slaveHistory
            // the range start from 1 because slaveHistory[0] = [0, notDefined]
            const indexHoldHistory = slaveHistory.findIndex(([index]) => index >= this.minIndex);
            if (indexHoldHistory > 1) {
                slaveHistory.splice(1, indexHoldHistory - 1);
                slaveHistory[0] = [0, notDefined]; // forget the first initial state
            }
        }
    }

    public collapse(
        slaveHistory: [number, unknown | Symbol][],
        obj: unknown | Symbol
    ): void {
        // find where we have to collapse in slaveHistory
        const indexSlaveHistory = this.findIndex(slaveHistory);

        // remove redo history
        slaveHistory.length = indexSlaveHistory + 1;

        // we don't write twice an item at the end of the history
        if (equality(slaveHistory[indexSlaveHistory][1], obj)) {
            return;
        }

        if (slaveHistory[indexSlaveHistory][0] < this.currentIndex) {
            // we need to create a new entry in slaveHistory
            slaveHistory.length++;
        }
        // else we override the last value because slaveHistory.last corresponds to the index we collapse to.
        slaveHistory[slaveHistory.length - 1] = [this.currentIndex, obj];
    }

    /**
     * return the index of the current object
     * @param slaveHistory the history of the object from which we want to get the current state
     */
    public get<T>(slaveHistory: [number, T][]): number {
        return this.findIndex(slaveHistory);
    }
}
