import { spawn } from "@await/spawn";

await spawn("node", [
    "--experimental-loader", "./loader.mjs",
    "./tests/relative-files-only/index.mjs"
    ],
    { cwd: "../" });
