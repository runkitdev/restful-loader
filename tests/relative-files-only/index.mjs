import { foo2 } from "./dependency.mjs";

export const foo3 = foo2;

console.log(foo2());
