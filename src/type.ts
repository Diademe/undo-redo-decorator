export type Key = string | number | symbol;
type Abstract<T> = Function & {prototype: T};
type Constructor<T> = new (...args: any[]) => T;
export type Class<T> = Abstract<T> | Constructor<T>;
export class Index {
    constructor(public indexVersion: number, public redoVersion: number) {}
    /**
     * this.before(that)
     *   -1 if this before that
     *   0 if this == that
     *   1 if this after that
     */
    public before(that: Index): number {
        if (this.redoVersion < that.redoVersion) {
            return -1;
        }
        if (this.redoVersion === that.redoVersion) {
            return this.indexVersion - that.indexVersion;
        }
        return 1;
    }
}

export class SuperArray<T> extends Array<T> {
    constructor() {
        super();
    }
    public get beforeLast() {
        return this[this.length - 2];
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

    public clone() {
        return SuperArray.from<T>(this);
    }

    public reverseFindIndex(
        f: (elt: T, index: number, history: SuperArray<T>) => boolean,
        from?: number
    ): number {
        from = from === undefined ? this.length - 1 : from;
        for (let index = from; index >= 0; index--) {
            if (f(this[index], index, this)) {
                return index;
            }
        }
        return -1;
    }
}

