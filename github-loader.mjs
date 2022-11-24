import { promiseRequest } from "./utils.mjs";

const Prefix = "github:";

const Loader = ({
    name: "GitHub",
    // Returns: Promise<{ status, headers, body } | false>
    async request(path) {

        if (!path.startsWith(Prefix)) return false;
        const url = "https://raw.githubusercontent.com/" + path.substring(Prefix.length);

        const result = await promiseRequest(url);
        // Github lies about its content type.
        delete result.headers["content-type"];

        return result;
    }
});

export default Loader;