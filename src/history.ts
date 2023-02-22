import { Class } from "./type";
import { notDefined } from "./utils";
import { MasterIndex } from "./core";

/**
 * keep track of the history of value a property had
 */
export class History<T extends Class<any>, K extends keyof T> {
    private history: [number, T[K] | Symbol][];
    constructor(private masterIndex: MasterIndex, obj: T[K]) {
        this.history = [[0, notDefined]];
        this.masterIndex.set(this.history, obj);
    }

    public get(): T[K] | Symbol {
        const index = this.masterIndex.get(this.history);
        if (index === -1) {
            // the object is not define for this state of undo
            return notDefined as any;
        }
        return this.history[index][1];
    }

    public set(obj: T[K] | Symbol): void {
        this.masterIndex.set(this.history, obj);
    }

    public collapse(valueToKeep: T[K] | Symbol): void {
        this.masterIndex.collapse(this.history, valueToKeep);
    }
}
