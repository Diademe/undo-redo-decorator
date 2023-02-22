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
