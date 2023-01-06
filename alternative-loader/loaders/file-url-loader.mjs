import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const Prefix = "file://";
const FileNotFoundCode = "ENOENT";

const Loader = ({
    name: "File URL",
    // Returns: Promise<{ statusCode, headers, body } | false>
    resolve(path) {

        if (!path.startsWith(Prefix)) return false;
        const resolvedPath = fileURLToPath(path);

        try {
            const content = readFileSync(resolvedPath, "utf8");
            return {
                statusCode: 200,
                headers: {},
                body: content,
            };
        } catch (e) {
            if (e.code === FileNotFoundCode) {
                return { status: 404 }
            }

            throw e;
        }
    },

    resolveRelativePath(path, parent) {
        return new URL(path, parent).toString();
    }
});

export default Loader;