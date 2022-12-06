import { promiseRequest } from "./utils.mjs";

export const loader = ({
    // Returns: Promise<{ status, headers, body } | false>
    async request(url) {

        if (!url.startsWith("https://")) return false;

        return promiseRequest(url);
    }
});

