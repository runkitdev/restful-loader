# This is a markdown file with Javascript fenced code blocks
The fenced code blocks in this file are runable. Just as if
the rest of the markdown in this file were comments.

```javascript
console.log("See! I'm a real javascript file!");
```


## Dependencies
This file can also bring in dependencies!
```javascript
import { foo2 } from "./dependency.mjs";
console.log("Imported foo is: ", foo2());
```

### Fenced Markdown Dependencies
But they don't have to be `.mjs` file. `.mjs.md` also work!
```javascript
import { foo } from "./dependency.mjs.md";
console.log("Imported foo from .mjs.md is: ", foo());
```
