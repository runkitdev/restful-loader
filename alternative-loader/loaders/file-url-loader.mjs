import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const Prefix = "file://";
const FileNotFoundCode = "ENOENT";

const Loader = ({
    name: "File URL",
    // Returns: Promise<{ statusCode, headers, body } | false>
    async resolve(path) {

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
    }
});

export default Loader;