# A better Node module loader API

An alternative proposal for the nodejs loader API.

## Prerequisite
The "fenced" loader requires cloning [the fenced loader repo](https://github.com/tolmasky/fenced/) into a sibling
directory of this package. In other words, clone the repo one directory up from this file's.

## How to use

To test the new loader run node with the following flag:
```bash
node --experimental-loader ./loader.mjs
```

By default the loader will load all the loader files in the `alternative-loader/loaders` directory, but it should
instead be defined by passing arguments to node.

Drop new loaders in that directory and they will be picked up automatically.

Once node is running you can use loaders by importing modules:

```js
await import("github:tolmasky/fenced/main/fenced/test.mjs.md")
``

The above is an example of chained loaders. The first loader knows how to resolve GitHub content with
an import specifier of `github:`, but it's ambivalent to content type. So when the downloaded content
goes through the content loader cycle again, this time it's the contents of test.mjs.md, which the
fenced loader knows how to resolve into a JavaScript module.
