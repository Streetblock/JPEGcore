const fs = require("node:fs");
const path = require("node:path");
const { loadCore, TestBlob } = require("../tests/helpers/load-core");

function usage() {
  console.error("Usage: node scripts/arith-trace-export.js <input.jpg> <output.txt> [traceLimit]");
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  const traceLimitArg = process.argv[4];
  if (!inputPath || !outputPath) {
    usage();
    process.exit(2);
  }

  const traceLimit = traceLimitArg ? Math.max(1, parseInt(traceLimitArg, 10) || 128) : 128;
  const repoRoot = path.resolve(__dirname, "..");
  const { JpegCORE } = loadCore(repoRoot);
  const bytes = fs.readFileSync(path.resolve(inputPath));

  JpegCORE.Config.strictArithmeticDecode = true;
  JpegCORE.Config.arithmeticTraceLimit = traceLimit;

  let errMsg = "";
  try {
    await JpegCORE.JpegJsCompat.decode(bytes);
    throw new Error("Expected strict arithmetic decode to fail, but decode succeeded.");
  } catch (err) {
    errMsg = String((err && err.message) || err || "");
  }

  const m = errMsg.match(/trace=\[(.*)\]\s*$/s);
  if (!m) {
    throw new Error(`Trace not found in strict decode error.\nMessage:\n${errMsg}`);
  }

  const rawTrace = m[1].trim();
  const lines = rawTrace ? rawTrace.split(" | ") : [];
  const out = [
    `input=${path.resolve(inputPath)}`,
    `traceLimit=${traceLimit}`,
    `count=${lines.length}`,
    ...lines
  ].join("\n");

  fs.writeFileSync(path.resolve(outputPath), out, "utf8");
  console.log(`Wrote ${lines.length} trace lines to ${path.resolve(outputPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

