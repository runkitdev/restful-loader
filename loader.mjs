// Manually register new loaders with `registerLoader`.
import { _transform, _resolvePath } from "./alternative-loader/register-loaders.mjs";

const _resolved = new Map();

export async function load(URLString, context, nextLoad)
{
    if (URLString.startsWith("node:")) {
        return nextLoad(URLString);
    }

    const { headers, body } = _resolved.get(URLString);
    const { format, source } = await _transform(URLString, { headers, body });

    return { format, source, shortCircuit: true };
}

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("node:")) {
        return nextResolve(specifier);
    }

    const [finalURL, result] = await _resolvePath(specifier);

    if (!finalURL) {
        throw new Error(`No loader found for ${specifier}.`);
    }

    // You can't share custom context between resolve and load.
    _resolved.set(finalURL, result);

    return {
        format: "module",
        shortCircuit: true,
        url: finalURL
    };
}