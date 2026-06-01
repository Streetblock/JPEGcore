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

  // SOF10 probe detection smoke check:
  // mutate SOF9 marker byte (FFC9) to SOF10 (FFCA) and ensure analysis flags arithmetic+progressive.
  const sof10Bytes = Buffer.from(bytes);
  let sof9Pos = -1;
  for (let i = 0; i < sof10Bytes.length - 1; i++) {
    if (sof10Bytes[i] === 0xff && sof10Bytes[i + 1] === 0xc9) {
      sof9Pos = i + 1;
      break;
    }
  }
  assert.ok(sof9Pos > 0, "fixture should include FFC9 marker");
  sof10Bytes[sof9Pos] = 0xca;
  const sof10Probe = await JpegCORE.Analysis.probe(new TestBlob([sof10Bytes]));
  assert.equal(sof10Probe.detectedArithmetic, true, "SOF10 should be treated as arithmetic");
  assert.equal(sof10Probe.detectedProgressive, true, "SOF10 should be treated as progressive");

  // Synthetic SOF10 end-to-end decode smoke:
  // keep arithmetic payload identical, only mutate SOF9 frame marker -> SOF10.
  const decodedSof10 = await JpegCORE.JpegJsCompat.decode(sof10Bytes);
  assert.equal(decodedSof10.width, decoded.width, "SOF10 width should match");
  assert.equal(decodedSof10.height, decoded.height, "SOF10 height should match");
  assert.equal(decodedSof10.data.length, decodedSof10.width * decodedSof10.height * 4, "SOF10 RGBA length mismatch");
  let sof10NonZeroSeen = false;
  for (let i = 0; i < decodedSof10.data.length; i += 4) {
    if (decodedSof10.data[i + 3] !== 255) throw new Error("SOF10 alpha should be opaque");
    if (decodedSof10.data[i] || decodedSof10.data[i + 1] || decodedSof10.data[i + 2]) sof10NonZeroSeen = true;
  }
  assert.equal(sof10NonZeroSeen, true, "SOF10 decoded RGB should not be all zero");

  // Real SOF10 fixture (optional): generated via `npm run fixture:sof10`.
  const realSof10Path = path.join(fixturesDir, "testorig-sof10-arith.jpg");
  if (fs.existsSync(realSof10Path)) {
    const realSof10Bytes = fs.readFileSync(realSof10Path);
    const realMarkers = collectMarkers(realSof10Bytes);
    assert.ok(realMarkers.has(0xca), "real SOF10 fixture should contain SOF10 marker");
    assert.ok(realMarkers.has(0xcc), "real SOF10 fixture should contain DAC marker");
    const realProbe = await JpegCORE.Analysis.probe(new TestBlob([realSof10Bytes]));
    assert.equal(realProbe.detectedArithmetic, true, "real SOF10 probe should be arithmetic");
    assert.equal(realProbe.detectedProgressive, true, "real SOF10 probe should be progressive");
    const realDecoded = await JpegCORE.JpegJsCompat.decode(realSof10Bytes);
    assert.ok(realDecoded.width > 0 && realDecoded.height > 0, "real SOF10 decode dimensions should be > 0");
    assert.equal(realDecoded.data.length, realDecoded.width * realDecoded.height * 4, "real SOF10 RGBA length mismatch");
  }

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
