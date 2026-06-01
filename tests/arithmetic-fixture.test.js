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
  assert.equal(typeof probe.restartIntervalMCUs, "number");
  assert.ok(Object.keys(probe.arithmeticDcTables || {}).length > 0, "probe should parse DAC DC tables");
  assert.ok(Object.keys(probe.arithmeticAcTables || {}).length > 0, "probe should parse DAC AC tables");
  for (const table of Object.values(probe.arithmeticDcTables || {})) {
    assert.ok(table.L >= 0 && table.L <= 15, "DC conditioning L out of range");
    assert.ok(table.U >= 0 && table.U <= 15, "DC conditioning U out of range");
    assert.ok(table.L <= table.U, "DC conditioning must satisfy L <= U");
  }
  for (const table of Object.values(probe.arithmeticAcTables || {})) {
    assert.ok(table.Kx >= 1 && table.Kx <= 63, "AC conditioning Kx out of range");
  }

  JpegCORE.Config.strictArithmeticDecode = false;
  const decoded = await JpegCORE.JpegJsCompat.decode(bytes);
  assert.ok(decoded.width > 0, "decoded width should be > 0");
  assert.ok(decoded.height > 0, "decoded height should be > 0");
  assert.equal(decoded.data.length, decoded.width * decoded.height * 4, "decoded RGBA length mismatch");
  let alphaOk = true;
  let nonZeroSeen = false;
  for (let i = 0; i < decoded.data.length; i += 4) {
    if (decoded.data[i + 3] !== 255) alphaOk = false;
    if (decoded.data[i] || decoded.data[i + 1] || decoded.data[i + 2]) nonZeroSeen = true;
  }
  assert.equal(alphaOk, true, "decoded alpha should be opaque");
  assert.equal(nonZeroSeen, true, "decoded RGB should not be all zero");

  const strictCore = loadCore(repoRoot).JpegCORE;
  strictCore.Config.strictArithmeticDecode = true;
  await assert.rejects(async () => {
    try {
      await strictCore.JpegJsCompat.decode(bytes);
    } catch (err) {
      const msg = String((err && err.message) || err || "");
      assert.match(msg, /strict mode|arithmetic jpeg/i);
      assert.match(msg, /step=\d+/i);
      assert.match(msg, /phase=/i);
      assert.match(msg, /traceLimitHit=/i);
      assert.match(msg, /trace=\[/i);
      assert.match(msg, /focus=\[/i);
      throw err;
    }
    throw new Error("strict mode should reject arithmetic staged decode");
  });

  console.log("Arithmetic JPEG fixture test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
