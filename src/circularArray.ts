import { UndoRedoError } from "./type";
import { positiveMod } from "./utils";

export class UndoRedoHistorySizeError extends UndoRedoError { }
export class UndoRedoHistoryError extends UndoRedoError { }

/**
 * an array that discard it's old index when size limit is exceeded
 * @internal
 */
export class CircularArray<T> {
    private data: T[];
    private isBoundedSize: boolean;
    private minUserIndex: number; // inclusive
    private maxUserIndex: number; // exclusive
    private minUserIndexPositionInData: number;

    constructor(size: number) {
        this.data = [];
        this.resize(size);
    }

    /**
     * lowest valide user index
     */
    public getMinIndex(): number {
        return this.minUserIndex;
    }

    /**
     * highest valide user index
     */
    public getMaxIndex(): number {
        return this.maxUserIndex - 1;
    }

    /**
     * resize existing array, discarding lower indexes if necessary
     * @param newSize of the new array. 0 for unlimited space
     */
    public resize(newSize: number): void {
        // invalid size
        if (newSize < 0) {
            throw new UndoRedoHistorySizeError(`Size = ${newSize} can not be bellow zero in a BondedArray`);
        }
        // empty array (initialization)
        if (this.data.length === 0) {
            this.maxUserIndex = 0;
            this.minUserIndex = 0;
            this.minUserIndexPositionInData = 0;
            this.data.length = newSize;
            this.data.fill(undefined, 0, newSize);
            this.isBoundedSize = true;
        }
        // from bounded to unlimited size
        if (newSize === 0 && this.isBoundedSize) {
            const newArray: T[] = [];
            for (let i = this.minUserIndex; i < this.maxUserIndex; ++i) {
                newArray.push(this.get(i));
            }
            this.isBoundedSize = false;
            this.minUserIndexPositionInData = 0;
            this.data = newArray;
        }
        // move to new array of data
        else if (newSize !== this.data.length) {
            const newData = new CircularArray<T>(newSize);
            newData.minUserIndex = this.minUserIndex;
            newData.maxUserIndex = this.maxUserIndex;
            const minUserIndexToCopy = Math.max(newData.minUserIndex, newData.maxUserIndex - newSize);
            for (let i = minUserIndexToCopy; i < newData.maxUserIndex; ++i) {
                newData.set(i, this.get(i));
            }
            this.data = newData.data;
            this.minUserIndex = newData.minUserIndex;
            this.maxUserIndex = newData.maxUserIndex;
            this.minUserIndexPositionInData = newData.minUserIndexPositionInData;
        }
    }

    /**
     * set `value` at `index`, discard minIndex if no space available
     * @param index of element to be set
     * @param value of element to be set
     */
    public set(index: number, value: T): void {
        if (index < this.minUserIndex) {
            throw new UndoRedoHistoryError("this index hase been deleted due to lack of space");
        }
        if (this.maxUserIndex < index) {
            throw new UndoRedoHistoryError("this index is not continuous with the previous max index");
        }
        if (this.maxUserIndex === index) {
            this.maxUserIndex = index + 1;
        }

        const newSize = this.maxUserIndex - this.minUserIndex;
        const outOfBoundSize = newSize - this.data.length;
        // the set will require to discard some element of data
        if (outOfBoundSize > 0 && this.isBoundedSize) {
            this.minUserIndex += outOfBoundSize;
            this.minUserIndexPositionInData = positiveMod(
                this.minUserIndexPositionInData + outOfBoundSize,
                this.data.length
            );
        }
        this.data[this.convertUserIndexToIndexInData(index)] = value;
    }

    /**
     * return the element at `index` or throw `UndoRedoError`
     * @param index of element to be returned
     */
    public get(index: number): T {
        if (index < this.minUserIndex || index >= this.maxUserIndex) {
            return undefined;
        }
        return this.data[this.convertUserIndexToIndexInData(index)];
    }

    /**
     * remove every elements of user index >= `start`
     * @param start
     */
    public splice(start: number): void {
        const oldMaxUserIndex = this.maxUserIndex;
        const newMaxUserIndex = Math.min(start, this.maxUserIndex);
        for (let i = newMaxUserIndex; i < oldMaxUserIndex; ++i) {
            this.data[this.convertUserIndexToIndexInData(i)] = undefined;
        }
        this.maxUserIndex = newMaxUserIndex;
    }

    private convertUserIndexToIndexInData(index: number): number {
        if (this.isBoundedSize) {
            return positiveMod(((index - this.minUserIndex) + this.minUserIndexPositionInData), this.data.length);
        }
        else {
            return (index - this.minUserIndex) + this.minUserIndexPositionInData;
        }
    }
}