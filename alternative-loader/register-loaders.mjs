import { readdirSync } from "fs";
import { join } from "path";

const KnownTypes = new Set(["module", "commonjs", "json", "wasm", "builtin"]);
const RegisteredLoaders = [];
const loaderResolvedSpecifiers = new Map();

for (const file of readdirSync("./alternative-loader/loaders/")) {
    await registerLoader("./" + join("loaders", file));
}

export async function registerLoader(loaderPath) {
    const { default: loader } = await import(loaderPath);
    RegisteredLoaders.push(normalizedLoader(loader));
}

export async function _transform(finalURL, {headers, body }) {
    var resolvedContent = { format: null, source: null };
    const convertedTypes = [];

    while (!KnownTypes.has(resolvedContent.format)) {
        const [loadedContent, mimeType] = await resolveContentToKnownType(finalURL, headers, body);

        // FIXME: Detect cycle in mime-type loaders.
        assertNonCyclicalTypes(mimeType, convertedTypes);
        convertedTypes.push(mimeType);

        if (!loadedContent) {
            throw new Error(`Unable to find loader for ${finalURL}.`);
        }

        resolvedContent = loadedContent;
    }

    return resolvedContent;
}

async function resolveContentToKnownType(finalURL, headers, body) {
    const mimeType = await resolveMimeType(finalURL, headers, body);

    if (!mimeType) {
        throw new Error(`Unknown mime type for ${finalURL}.`);
    }

    const finalScript = await resolveLoad(mimeType, headers, body);

    return [finalScript, mimeType];
}

const statusOk = statusCode => statusCode >= 200 && statusCode < 300;
const statusRedirect = statusCode => statusCode >= 300 && statusCode < 400;
const statusError = statusCode => statusCode >= 400;

function isBareSpecifier(specifier) {
    return specifier[0] && specifier[0] !== '/' && specifier[0] !== '.';
}

export async function _resolvePath(path, context) {
    if (isRelativeSpecifier(path)) {
        const loader = loaderResolvedSpecifiers.get(context.parentURL);
        path = await loader.resolveRelativePath(path, context.parentURL);

        if (typeof path !== "string") {
            // FIXME: Add paths to the error.
            throw new TypeError(`${loader.name} loader returned a non-string value from \`resolveRelativePath\`.`);
        }
    }

    if (isBareSpecifier(path)) {
        for (const loader of RegisteredLoaders) {
            if (loader.resolve) {
                const result = await loader.resolve(path);

                if (!result)
                    continue;

                validatePathResolveResult(result);
                loaderResolvedSpecifiers.set(path, loader);

                // Success!
                if (statusOk(result.statusCode))
                    return [path, result];

                // Follow the redirect.
                if (statusRedirect(result.statusCode))
                    return resolvePath(result.headers["location"]);

                // FIXME: should we throw here or just try the next loader?
                // if (statusError(result.statusCode))
                throw new Error("FIXME: errored trying to resolve path. " + path);
            }
        }

        return [null, {}];
    }
}

async function resolveMimeType(url, headers, body) {
    // If there is already a content-type then the loader system already has all the
    // information it needs.
    if (headers["content-type"]) {
        return headers["content-type"];
    }

    for (const loader of RegisteredLoaders) {
        if (!loader.identify) continue;

        const result = await loader.identify(url, body, headers);
        if (result) {
            return result;
        }
    }
}

async function resolveLoad(mimeType, headers, body) {
    // When the mimetype is javascript, we're done. Just return the body and the format.
    // FIXME: The official mimetype for cjs is the same as an esm module, which is really
    // unfortunate, so we need to come up with a clean way to specify "legacy" cjs file
    // (which makes up the VAST MAJORITY of the js ecosystem).
    if (mimeType === "text/javascript" || mimeType === "application/javascript") {
        return {
            source: body,
            format: "module"
        }
    }

    for (const loader of RegisteredLoaders) {
        if (loader.accepts && loader.accepts.includes(mimeType)) {
            const result = await loader.transform(headers, body);

            // Validate the result.
            if (typeof result !== "object") {
                throw new TypeError(`Returned value from "${loader.name}" Loader was not an object.`);
            }

            if (typeof result.source !== "string") {
                throw new TypeError(`Returned value from "${loader.name}" Loader did not contain a valid \`source\` field.`);
            }

            if (typeof result.format !== "string") {
                throw new TypeError(`Returned value from "${loader.name}" Loader did not contain a valid \`format\` field.`);
            }

            return result;
        }
    }
}

function assertNonCyclicalTypes(mimeType, convertedTypes) {
    convertedTypes.forEach((type, index) => {
        if (mimeType === type) {
            const cyclePath = convertedTypes.slice(0, index).join(" -> ") + type;
            const message = `Cyclical mime-types found during transform.\n${cyclePath}`;

            throw new Error(message);
        }
    });
}

function normalizedLoader(exports) {
    // FIXME: Maybe rename `resolve` to `resolveBareSpecifier`?
    const { name = "Unnamed", resolve, resolveRelativePath, identify, extensionMimeMap, transform, accepts } = exports;

    const makeError = (ErrorType, message) => new ErrorType(`Error registering loader "${name}". ${message}`);

    if (identify && typeof identify !== "function") {
        throw makeError(TypeError, "Expected `identify` field to be a function.");
    }

    if (resolve && typeof resolve !== "function") {
        throw makeError(TypeError, "Expected `resolve` field to be a function.");
    }

    if (resolve && typeof resolveRelativePath !== "function") {
        throw makeError(TypeError, "A function `resolveRelativePath` must be supplied if a `resolve` is also supplied.");
    }

    const id = makeIdentify(identify, extensionMimeMap);

    if (transform && !accepts) {
        throw makeError(Error, "If you supply a `transform` function you must also provide an `accepts` field with a list of acceptable mime-types.");
    } else if (accepts && !transform) {
        throw makeError(Error, "If you supply a `accepts` function you must also provide an `transform` field with a function those accepts that mime-types.");
    }

    if (transform && typeof transform !== "function") {
        throw makeError(TypeError, "Expected `transform` field to be a function.");
    }

    if (accepts && typeof accepts !== "string" && !Array.isArray(accepts)) {
        throw makeError(TypeError, "Expected `accepts` field to be a mime-type string or an array of mime-type strings.");
    }

    // FIXME: validate types.

    return {
        name: name,
        resolve: resolve,
        resolveRelativePath: resolveRelativePath,
        transform: transform,
        accepts: accepts,
        identify: id,
    }
}

import { extname } from "node:path";

// There are two ways for identify to work for loaders, the low level way
// is to just supply a function that returns a mimetype. But loaders can
// also return a map from extensions to mime-types.
// The function will convert that map into a function for the
// loader system to use.
// If both a map and a function are provided then a function is created that
// first looks up the entry in the map, and falls back to the function
// if no entry is found.
function makeIdentify(idFn, map) {
    if (!map)
    {
        if (!idFn)
            return undefined;

        return idFn;
    }

    // FIXME Allow RegExps?
    Object.keys(map).forEach(key => {
        const value = map[key];
        if (typeof value !== "string") {
            // FIXME: Validate known mime types?
            throw new TypeError(`Invalid \`extensionMimeMap\` value for key \`${key}\`.`);
        }
    });

    function identifyFromMimeMap(url) {
        const ext = extname(url);
        if (Object.prototype.hasOwnProperty.call(map, ext)) {
            return map[ext];
        }
    }

    if (!idFn)
        return identifyFromMimeMap;

    // If both the function and the map are given, compose them:
    return function identify(url, body, headers) {
        const result = identifyFromMimeMap(url);
        if (result !== undefined) return result;

        return idFn(url, body, headers);
    };
}

function validatePathResolveResult(result) {
    if (typeof result !== "object")
        throw new TypeError("Result from resolve for loaders must be `false` or an object.");

    if (!Reflect.has(result, "statusCode"))
        throw new TypeError("Result from resolve for loaders must be `false` or an object with contains a `statusCode` field.");

    if (typeof result.statusCode !== "number")
        throw new TypeError("Loader result `statusCode` field must be a number.");

    // If the status code is not Ok then move along.
    if (!statusOk(result.statusCode))
        return;

    if (!Reflect.has(result, "body"))
        throw new TypeError("Result from loader must have a `body` field if the `statusCode` is in the 200 range.");

    // FIXME: Should this throw or just add an empty headers field?
    if (!Reflect.has(result, "headers"))
        result.headers = {};
}

// Pulled from nodejs module resolve code.
function isRelativeSpecifier(specifier) {
    if (specifier[0] === '.') {
      if (specifier.length === 1 || specifier[1] === '/') return true;
      if (specifier[1] === '.') {
        if (specifier.length === 2 || specifier[2] === '/') return true;
      }
    }
    return false;
}

// function escapeRegexpInput(str) {
//     const specials = new Set("[ * + ? { . ( ) ^ $ | \\".split(" "));
//     let out = "";

//     for (let i = 0; i < str.length; i++) {
//         const char = str[i];
//         if (specials.has(char)) {
//             out += "\\" + char;
//         } else {
//             out += char;
//         }
//     }

//     return out;
// }
