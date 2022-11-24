import { registerLoader, load } from "./loader-register.mjs";

await registerLoader("./github-loader.mjs");
await registerLoader("./fenced-loader.mjs");

const fencedMarkdownGitHubURL = "github:tolmasky/fenced/main/fenced/test.mjs.md";
const result = await load(fencedMarkdownGitHubURL);

console.log(result);
