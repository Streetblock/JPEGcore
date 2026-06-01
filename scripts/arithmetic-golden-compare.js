const fs = require("node:fs");
const path = require("node:path");
const { loadCore, TestBlob } = require("../tests/helpers/load-core");

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

function parsePpmP6(buffer) {
  const isWs = (c) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
  let pos = 0;
  const readToken = () => {
    while (pos < buffer.length) {
      const c = buffer[pos];
      if (c === 0x23) {
        while (pos < buffer.length && buffer[pos] !== 0x0a) pos++;
      } else if (isWs(c)) {
        pos++;
      } else break;
    }
    const start = pos;
    while (pos < buffer.length && !isWs(buffer[pos])) pos++;
    return buffer.toString("ascii", start, pos);
  };

  const magic = readToken();
  if (magic !== "P6") throw new Error("PPM parser expects binary P6 format");
  const width = Number(readToken());
  const height = Number(readToken());
  const max = Number(readToken());
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Invalid PPM dimensions");
  }
  if (max !== 255) throw new Error(`Unsupported PPM max value: ${max}`);
  while (pos < buffer.length && isWs(buffer[pos])) pos++;

  const expected = width * height * 3;
  const rgb = buffer.subarray(pos);
  if (rgb.length < expected) {
    throw new Error(`PPM data too short: got ${rgb.length}, expected ${expected}`);
  }
  return { width, height, rgb: rgb.subarray(0, expected) };
}

function rgbaToPpmBytes(width, height, rgba) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  const rgb = Buffer.allocUnsafe(width * height * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4) {
    rgb[j++] = rgba[i];
    rgb[j++] = rgba[i + 1];
    rgb[j++] = rgba[i + 2];
  }
  return Buffer.concat([header, rgb]);
}

function computeMetrics(width, height, coreRgba, refRgb) {
  const totalPx = width * height;
  let sse = 0;
  let maxDiff = 0;
  let neutralPx = 0;
  for (let p = 0; p < totalPx; p++) {
    const i4 = p * 4;
    const i3 = p * 3;
    const dr = Math.abs(coreRgba[i4] - refRgb[i3]);
    const dg = Math.abs(coreRgba[i4 + 1] - refRgb[i3 + 1]);
    const db = Math.abs(coreRgba[i4 + 2] - refRgb[i3 + 2]);
    if (dr > maxDiff) maxDiff = dr;
    if (dg > maxDiff) maxDiff = dg;
    if (db > maxDiff) maxDiff = db;
    sse += dr * dr + dg * dg + db * db;
    if (coreRgba[i4] === coreRgba[i4 + 1] && coreRgba[i4 + 1] === coreRgba[i4 + 2]) {
      neutralPx++;
    }
  }
  const rmse = Math.sqrt(sse / (totalPx * 3));
  return { rmse, maxDiff, neutralPx, totalPx, neutralRatio: neutralPx / totalPx };
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(__dirname, "..");
  const fixturePath = path.resolve(repoRoot, args.fixture || "tests/fixtures/jpeg/libjpeg-turbo-testimgari.jpg");
  const goldenPath = args.golden ? path.resolve(repoRoot, args.golden) : null;
  const exportCorePpm = args["export-core-ppm"] ? path.resolve(repoRoot, args["export-core-ppm"]) : null;

  const { JpegCORE } = loadCore(repoRoot);
  const bytes = fs.readFileSync(fixturePath);
  JpegCORE.Config.strictArithmeticDecode = false;
  const decoded = await JpegCORE.JpegJsCompat.decode(bytes);

  if (exportCorePpm) {
    fs.writeFileSync(exportCorePpm, rgbaToPpmBytes(decoded.width, decoded.height, decoded.data));
    console.log(`Wrote core PPM: ${exportCorePpm}`);
  }

  if (!goldenPath) {
    console.log(`Decoded fixture: ${path.relative(repoRoot, fixturePath)} (${decoded.width}x${decoded.height})`);
    return;
  }

  const golden = parsePpmP6(fs.readFileSync(goldenPath));
  if (golden.width !== decoded.width || golden.height !== decoded.height) {
    throw new Error(
      `Dimension mismatch: core=${decoded.width}x${decoded.height}, golden=${golden.width}x${golden.height}`
    );
  }

  const metrics = computeMetrics(decoded.width, decoded.height, decoded.data, golden.rgb);
  console.log(`fixture=${path.relative(repoRoot, fixturePath)}`);
  console.log(`golden=${path.relative(repoRoot, goldenPath)}`);
  console.log(`size=${decoded.width}x${decoded.height}`);
  console.log(`rmse=${metrics.rmse.toFixed(4)}`);
  console.log(`maxDiff=${metrics.maxDiff}`);
  console.log(
    `neutralPx=${metrics.neutralPx}/${metrics.totalPx} (${(metrics.neutralRatio * 100).toFixed(2)}%)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
