const fs = require("node:fs");
const path = require("node:path");

function parseBuildArgs(argv) {
  let arithmetic = true;
  let outputOverride = null;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-arithmetic") {
      arithmetic = false;
      continue;
    }
    if (arg === "--arithmetic=0" || arg === "--arithmetic=false" || arg === "--arithmetic=off") {
      arithmetic = false;
      continue;
    }
    if (arg === "--arithmetic=1" || arg === "--arithmetic=true" || arg === "--arithmetic=on") {
      arithmetic = true;
      continue;
    }
    if (arg === "--output" && i + 1 < argv.length) {
      outputOverride = argv[++i];
      continue;
    }
  }
  if (process.env.JPEGCORE_BUILD_ARITHMETIC === "0" || process.env.JPEGCORE_BUILD_ARITHMETIC === "false") {
    arithmetic = false;
  }
  if (process.env.JPEGCORE_BUILD_ARITHMETIC === "1" || process.env.JPEGCORE_BUILD_ARITHMETIC === "true") {
    arithmetic = true;
  }
  return { arithmetic, outputOverride };
}

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(__dirname, "core-build-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const src = path.join(root, manifest.srcDir);
const parts = manifest.parts;
const args = parseBuildArgs(process.argv);
const outputPath = path.join(root, args.outputOverride || manifest.output);
const buildFlags = { arithmetic: args.arithmetic };

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

fs.writeFileSync(
  outputPath,
  `${header}const JPEGCORE_BUILD_FLAGS = ${JSON.stringify(buildFlags)};\nconst JpegCORE = {\n${body}${footer}`
);
