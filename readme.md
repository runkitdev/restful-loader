# A better Node module loader API

An alternative proposal for the nodejs loader API.

## Prerequisite
The "fenced" loader requires cloning [the fenced loader repo](https://github.com/tolmasky/fenced/) into a sibling directory of this package. In other words, clone the repo one directory up from this file's.

## How to use

To test the new loader run node with the following flag:
```bash
node --experimental-loader ./loader.mjs
```

By default the loader will load all the loader files in the `alternative-loader/loaders` directory, but it should instead be defined by passing arguments to node.

Drop new loaders in that directory and they will be picked up automatically.

Once node is running you can use loaders by importing modules:

```js
await import("github:tolmasky/fenced/main/fenced/test.mjs.md")
```

The above is an example of chained loaders. The first loader knows how to resolve GitHub content with an import specifier of `github:`, but it's ambivalent to content type. So when the downloaded content goes through the content loader cycle again, this time it's the contents of test.mjs.md, which the fenced loader knows how to resolve into a JavaScript module.


## How it works
Loaders are modeled on HTTP mechanisms used to identify different kinds of content. This gives them flexibility to resolve any number of import paths. Loaders do not have to use HTTP, of course, they merely use the some of the same techniques that makes the web so flexible.

A loader exports a number of values, most of which can be used independent of each other depending on the goal. They are as follows (note: the names of these fields may change):

- `name`
- `request`
- `identify`
- `extensionMimeMap`
- `accepts`
- `load`

### `name`
The name of the loader, which is mostly useful when debugging.

### `request`
`request: async Function(importSpecifier: String) -> false | {statusCode, headers, body }`: A function that resolves an importSpecifier string to contents of a file plus some associated metadata.

> **Note**
> If the loader doesn't know how to resolve a given specifier, it should return `false`.

Because loaders may encounter errors when loading files it leverages HTTP status codes. So if the loader gets a `ENOENT` when reading from the filesystem, the loader might return a 404.

The `headers` field is a dictionary object that can be used to provide metadata to other loaders or to transform functions later. For the most part the most interesting field will be the `Content-Type` header, because not all specifiers include file extensions.

Lastly the `body` field is the contents of the file.

###  `identify`
`identify: async Function(url, body, headers) -> false | mimetypeString`: As mentioned in the `request` section, not all import specifiers have file extensions. For this reason, some files may have an unknown MIMEtype when they are loaded. This function may be used to identify the mimetype of the file.

Most commonly this function will just check a specifier's file extension and return the correct mimetype, and this API has a shorthand for that listed below.

Imagine though a javascript file designed to be run as a shell script. Most shell scripts do not contain file extensions but instead read the first few bytes of the file for a shebang (e.g. `#!/usr/bin/wasitime`). A WASM shell script loader may read this shebang to identify that the content type is `application/wasm`. Which a standalone WASM can later use to instantiate a wasm module.

> **Note**
> This function will not be called if the `request` function returns headers which contains a `content-type` header.

### `extensionMimeMap`
`extensionMimeMap: { fileExtension: MimeType}`: (Not implemented yet) a map of file extensions mapped to their respective mimetypes. This is a shorthand fot the `identify` function.

> **Note**
> If a loader provides both a `extensionMimeMap` field and an `identify` field the loader system will first check this map and only call the `identify` function if an entry doesn't exist. In general a loader will usually only provide one of these fields, not both.

### `accepts`
`accepts: [mimetypeStrings]`: A list of mimetype strings the `load` function can accept.

### `load`
`load(headers, body) -> { source, format }`: When a file is identified as a mimetype which the loader can accept (via the `accepts` header), this function will be called with the contents of the file and the headers provided when the content was first loaded. It should return an object containing the source of the file and the format which an engine can interpret. Right now NodeJS accepts the following values: `commonjs`, `module`, `json`, `wasm`, and `builtin`, but it would be nice if we could instead continue to use valid `content-type` mimetypes.

## Composability

These fields are designed to be used so that loaders can easily be composed together. A GitHub loader, for example, might only be able to download content from GitHub when a an import specifier is prefixed with `github:`, and as you can see in this repo, it only implements the `request` function.

The "Fenced loader" (which converts markdown files which have fenced javascript into a javascript module) doesn't care if the file came from npm, GitHub, or a generic HTTP loader, it only cares if the file extension is `.js.md`. As a result that loader only implements a `load` function and an `extensionMimeMap`.

And finally the "node-shell" loader only identifies unknown files which have a `#!/usr/bin/node` shebang at the top of the file. So it only implements the `identify` function.
