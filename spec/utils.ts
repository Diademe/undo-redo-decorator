
// source https://stackoverflow.com/questions/40922531/how-to-check-if-a-javascript-function-is-a-constructor
export const is_constructor = (f: any) => {
    try {
        Reflect.construct(String, [], f);
    }
    catch {
        return false;
    }
    return true;
};
