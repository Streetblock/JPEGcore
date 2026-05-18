const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(__dirname, "core-build-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const src = path.join(root, manifest.srcDir);
const parts = manifest.parts;

for (const part of parts) {
  const fullPath = path.join(src, part);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing source fragment: ${path.relative(root, fullPath)}`);
  }
}

if (parts[0] !== "header.js" || parts[parts.length - 1] !== "footer.js") {
  throw new Error("Build manifest must start with header.js and end with footer.js");
}

const header = fs.readFileSync(path.join(src, parts[0]), "utf8");
const body = parts
  .slice(1, -1)
  .map((file) => fs.readFileSync(path.join(src, file), "utf8"))
  .join("");
const footer = fs.readFileSync(path.join(src, parts[parts.length - 1]), "utf8");

fs.writeFileSync(path.join(root, manifest.output), `${header}const JpegCORE = {\n${body}${footer}`);
