import { extname } from "node:path";

const Loader = {
    name: "Default JS and MSJ Identify",
    identify(url, body, headers) {
        const ext = extname(url);

        if (ext === ".js") {
            return "text/javascript";
        }

        if (ext === ".mjs") {
            return "text/javascript";
        }

        return false;
    }
};

export default Loader;
