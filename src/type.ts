import { SuperArray, Index, MasterIndex } from "./core";

export type Key = string | number | symbol;
export type GenericIdentityFunc<T> = (arg: T) => T;

export class History<T> {
    private history: SuperArray<[Index, T]>;
    constructor(private masterIndex: MasterIndex, obj: T) {
        this.history = new SuperArray<[Index, T]>();
        this.masterIndex.set(this.history, obj);
    }

    get(): T {
        const index = this.masterIndex.get(this.history);
        if (index === -1) {
            throw Error(
                `the object ${JSON.stringify(
                    this
                )} is not define for this state of undo ${this.masterIndex.getCurrentIndex()}
                it was defined at ${this.history[0][0].indexVersion}`
            );
        }
        return this.history[index][1];
    }

    set(obj: T) {
        this.masterIndex.set(this.history, obj);
    }
}
