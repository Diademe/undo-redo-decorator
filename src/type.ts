export class UndoRedoError extends Error {}

export type Key = string | number;
type Abstract<T> = Function & {prototype: T};
type Constructor<T> = new (...args: any[]) => T;
export type Class<T> = (Abstract<T> | Constructor<T>) & {
    [key: number]: any;
    [key: string]: any;
};

export interface ShallowSave {
    [index: number]: any[];
}

export enum Visitor {
    save,
    load,
    collapse
}

export class SuperArray<T> extends Array<T> {
    constructor(...args: any[]) {
        super(...args);
    }

    public get last() {
        return this[this.length - 1];
    }

    public set last(value: T) {
        this[this.length - 1] = value;
    }

    public static from<T>(iterable: Iterable<T> | ArrayLike<T>): SuperArray<T> {
        const iterables = Array.from<T>((iterable as any) || ([] as any));
        iterables.unshift(undefined);
        return new (Function.prototype.bind.apply(SuperArray, iterables))();
    }

    public clone(): this {
        return SuperArray.from<T>(this) as this;
    }

    /**
     * @param predicate
     * @param from starting index
     * @returns last index where predicate is true, 0
     */
    public reverseFindIndex(
        predicate: (elt: T, index: number, history: SuperArray<T>) => boolean,
        from?: number
    ): number {
        from = from === undefined ? this.length - 1 : from;
        for (let index = from; index >= 0; index--) {
            if (predicate(this[index], index, this)) {
                return index;
            }
        }
        return 0;
    }
}

