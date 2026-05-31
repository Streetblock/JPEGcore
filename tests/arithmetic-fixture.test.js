const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCore, TestBlob } = require("./helpers/load-core");

const repoRoot = path.resolve(__dirname, "..");
const fixturesDir = path.join(__dirname, "fixtures", "jpeg");
const { JpegCORE } = loadCore(repoRoot);

function readFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name));
}

function collectMarkers(bytes) {
  const markers = new Set();
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] !== 0xff && bytes[i + 1] !== 0x00) {
      markers.add(bytes[i + 1]);
    }
  }
  return markers;
}

async function main() {
  const bytes = readFixture("libjpeg-turbo-testimgari.jpg");
  const markers = collectMarkers(bytes);
  assert.ok(markers.has(0xc9), "fixture should contain SOF9 marker");
  assert.ok(markers.has(0xcc), "fixture should contain DAC marker");

  const probe = await JpegCORE.Analysis.probe(new TestBlob([bytes]));
  assert.equal(probe.detectedMode, "420");
  assert.equal(probe.detectedArithmetic, true);
  assert.ok(Object.keys(probe.arithmeticDcTables || {}).length > 0, "probe should parse DAC DC tables");
  assert.ok(Object.keys(probe.arithmeticAcTables || {}).length > 0, "probe should parse DAC AC tables");

  // Current baseline expectation for this branch:
  // arithmetic-coded JPEG is not decoded yet and should fail cleanly.
  await assert.rejects(
    () => JpegCORE.JpegJsCompat.decode(bytes),
    /arithmetic jpeg|unsupported|invalid|decode/i
  );

  console.log("Arithmetic JPEG fixture test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
