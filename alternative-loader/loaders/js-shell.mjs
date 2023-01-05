export const name = "JS Shell";

const commonNodeLocations = new Set([
   "/usr/bin/node"
   // other common locations here...
]);

export function identify(url, header, body) {
    if (body.length < 4) return undefined;
    if (body.charAt(0) !== '#' || body.charAt(1) !== "!") return undefined;

    const value = body.split("\n")[0].substring(2);
    if (commonNodeLocations.has(value)) {
        return "text/javascript";
    }

    return undefined;
}

export default { identify, name };
