import { foo } from "./dependency.mjs";

export const foo2 = foo();

console.log(foo2);
