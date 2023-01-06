import { promiseRequest } from "../utils.mjs";
import { URL, pathToFileURL } from "node:url";

const Prefix = "github:";

const Loader = ({
    name: "GitHub",
    // Returns: Promise<{ statusCode, headers, body } | false>
    async resolve(path) {
        if (!path.startsWith(Prefix)) return false;
        const url = "https://raw.githubusercontent.com/" + path.substring(Prefix.length);

        const result = await promiseRequest(url);
        // Github lies about its content type.
        delete result.headers["content-type"];

        return result;
    },

    // fn(path: String, parents: String): String
    async resolveRelativePath(path, parents) {
        const parent = "/" + parents.substring(Prefix.length)
        const resolved = (new URL(path, pathToFileURL(parent))).pathname
        return Prefix + resolved.substring(1);
    }
});

export default Loader;