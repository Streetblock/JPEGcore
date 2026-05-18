const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");

const parts = [
  "header.js",
  "core.js",
  "constants.js",
  "utils.js",
  "analysis.js",
  "decoder.js",
  "transformer.js",
  "glitch.js",
  "encoder.js",
  "jpeg-js-compat.js",
  "footer.js"
];

const header = fs.readFileSync(path.join(src, "header.js"), "utf8");
const body = parts
  .slice(1, -1)
  .map((file) => fs.readFileSync(path.join(src, file), "utf8"))
  .join("");
const footer = fs.readFileSync(path.join(src, "footer.js"), "utf8");

fs.writeFileSync(path.join(root, "JPEGcore.js"), `${header}const JpegCORE = {\n${body}${footer}`);
