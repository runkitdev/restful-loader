## This file is a dependency
But it works the same way as a regular markdown file with fenced Javascript.
Inside the code blocks you can run code or provide exports.

```javascript
import { foo2 } from "./dependency.mjs";
export function foo () {
    return foo2();
};
```
