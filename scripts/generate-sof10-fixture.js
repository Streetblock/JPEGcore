const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function readFirstSofMarker(bytes) {
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] !== 0xff) continue;
    const m = bytes[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return m;
    }
  }
  return -1;
}

function hasMarker(bytes, markerCode) {
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === markerCode) return true;
  }
  return false;
}

function resolveCjpeg() {
  if (process.env.CJPEG_PATH && fs.existsSync(process.env.CJPEG_PATH)) {
    return process.env.CJPEG_PATH;
  }
  return "cjpeg";
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const args = parseArgs(process.argv);
  const input = path.resolve(repoRoot, args.input || "dev/libjpeg-turbo-src/testimages/testorig.ppm");
  const output = path.resolve(repoRoot, args.output || "tests/fixtures/jpeg/testorig-sof10-arith.jpg");

  if (!fs.existsSync(input)) {
    throw new Error(`Input not found: ${input}`);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const cjpeg = resolveCjpeg();
  const result = spawnSync(
    cjpeg,
    ["-ppm", "-quality", "75", "-progressive", "-arithmetic", "-outfile", output, input],
    { encoding: "utf8" }
  );

  if (result.error || result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const detail = stderr || stdout || (result.error ? String(result.error.message || result.error) : "");
    throw new Error(
      `cjpeg failed. Ensure cjpeg is installed or set CJPEG_PATH. Command: ${cjpeg} ... Detail: ${detail}`
    );
  }

  if (!fs.existsSync(output)) {
    throw new Error(`cjpeg reported success but output is missing: ${output}`);
  }

  const bytes = fs.readFileSync(output);
  const sof = readFirstSofMarker(bytes);
  if (sof !== 0xca) {
    throw new Error(`Expected SOF10 (FFCA), got marker 0x${sof.toString(16)}`);
  }
  if (!hasMarker(bytes, 0xcc)) {
    throw new Error("Expected DAC marker (FFCC) in arithmetic JPEG output");
  }

  console.log(`Generated: ${path.relative(repoRoot, output)}`);
  console.log(`SOF marker: FF${sof.toString(16).toUpperCase()}`);
  console.log(`SHA-256: ${sha256(output)}`);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
