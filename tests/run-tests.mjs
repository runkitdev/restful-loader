import { spawn } from "@await/spawn";

console.log(await spawn("node", [
    "--experimental-loader", "./loader.mjs",
    "./tests/relative-files-only/index.mjs"
    ],
    { cwd: "../" }));

console.log(await spawn("node", [
    "--experimental-loader", "./loader.mjs",
    "./tests/fenced-markdown/index.mjs.md"
    ],
    { cwd: "../" }));

console.log(await spawn("node", [
    "--experimental-loader", "./loader.mjs",
    "./tests/shell-loader/shell-script"
    ],
    { cwd: "../" }));

console.log(await spawn("node", [
    "--experimental-loader", "./loader.mjs",
    "./tests/github-basic/index.mjs"
    ],
    { cwd: "../" }));

console.log(await spawn("node", [
    "--experimental-loader", "./loader.mjs",
    "./tests/github-fenced/index.mjs"
    ],
    { cwd: "../" }));