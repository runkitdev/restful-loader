import { toModuleSource } from "../../../fenced-code-node-loader-demo/fenced.mjs";

const Loader = {
    name: "Fenced Markdown",
    identify(url, body, headers) {
        if (/\.mjs\.md$/.test(url)) {
            return "text/markdown+js";
        }
    },

    async transform(headers, body) {
        const source = await toModuleSource(body, "");

        return {
            source,
            format: "module",
        };
    },

    accepts: ["text/markdown+js"],
};


export default Loader;
