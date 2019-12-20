
// source https://stackoverflow.com/questions/40922531/how-to-check-if-a-javascript-function-is-a-constructor
export function is_constructor(f: any) {
    try {
        Reflect.construct(String, [], f);
    }
    catch (e) {
        return false;
    }
    return true;
}
