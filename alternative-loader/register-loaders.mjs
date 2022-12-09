import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const KnownTypes = new Set(["module", "commonjs", "json", "wasm", "builtin"]);
const RegisteredLoaders = [];

for (const file of readdirSync("./alternative-loader/loaders/")) {
    await registerLoader("./" + join("loaders", file));
}

export async function registerLoader(loaderPath) {
    let { default: loader } = await import(loaderPath);
    RegisteredLoaders.push(normalizedLoader(loader));
}

export async function _load(finalURL, {headers, body }) {
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

export async function _resolvePath(path) {
    if (isBareSpecifier(path)) {
        for (const loader of RegisteredLoaders) {
            if (loader.request) {
                const result = await loader.request(path);

                if (!result)
                    continue;

                // Success!
                if (statusOk(result.statusCode))
                    return [path, result];

                // Follow the redirect.
                if (statusRedirect(result.statusCode))
                    return resolvePath(result.headers["location"]);

                // FIXME: should we throw here or just try the next loader?
                // if (statusError(result.statusCode))
                return new Error("FIXME: errored trying to request URL.");
            }
        }

        return [null, {}];
    } else {
        // fall through to the default loader!
        throw new Error("Default loader not implemented yet.");
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
            const result = await loader.load(headers, body);

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

// function makeIdentifyFromExtMimeMap(ext, mimeType) {
//     const regexp = new RegExp(escapeRegexpInput(ext));
//     const test = input => {
//         return regexp.test(input) && mimeType;
//     };

//     return test;
// }

// function getContentTypeFromURL(URL) {
//     for (let i = mimeTypeMap.length - 1; i >= 0; i--) {
//         const test = mimeTypeMap[i];
//         return test(URL);
//     }

//     return undefined; // ??
// }

function assertNonCyclicalTypes(mimeType, convertedTypes) {

}

function assertType(input, expected, name) {
    const type = typeof input;
    if (type !== expected)
        throw new TypeError(`Unexpected type fo parameter ${name}, expected ${expected} but received ${type}`);
}

function normalizedLoader(exports) {
    const { name, request, identify, extensionMap, load, accepts } = exports;

    const id = identify || undefined;// || makeIdentifyFromExtMimeMap(extensionMap.)

    if (load && !accepts) {
        throw new Error("If you supply a `load` function you must also provide an `accepts` field with a list of acceptable mime-types.");
    }

    // FIXME: validate types.

    return {
        name: name || "Unnamed",
        request: request || undefined,
        load: load || undefined,
        accepts: accepts || undefined,
        identify: id,
    }
}