import { notDefined } from "./utils";
import { MasterIndex } from "./core";

/**
 * keep track of the history of value a property had
 */
export class History {
    private history: [number, unknown | Symbol][];
    constructor(private masterIndex: MasterIndex, obj: unknown) {
        this.history = [[0, notDefined]];
        this.masterIndex.set(this.history, obj);
    }

    public get(): unknown | Symbol {
        const index = this.masterIndex.get(this.history);
        if (index === -1) {
            // the object is not define for this state of undo
            return notDefined as any;
        }
        return this.history[index][1];
    }

    public set(obj: unknown | Symbol): void {
        this.masterIndex.set(this.history, obj);
    }

    public collapse(valueToKeep: unknown | Symbol): void {
        this.masterIndex.collapse(this.history, valueToKeep);
    }
}
