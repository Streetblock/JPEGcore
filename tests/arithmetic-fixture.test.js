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

  // Current baseline expectation for this branch:
  // arithmetic-coded JPEG is not decoded yet and should fail cleanly.
  await assert.rejects(
    () => JpegCORE.JpegJsCompat.decode(bytes),
    /unsupported|invalid|decode/i
  );

  // Native arithmetic fallback path should work when explicitly enabled.
  const fallbackPixels = new Uint8ClampedArray([12, 34, 56, 255]);
  const fallbackCore = loadCore(repoRoot, {
    createImageBitmap: async () => ({
      width: 1,
      height: 1,
      close() {}
    }),
    OffscreenCanvas: class MockOffscreenCanvas {
      constructor(width, height) {
        this.width = width;
        this.height = height;
      }
      getContext() {
        return {
          drawImage() {},
          getImageData: () => ({ data: fallbackPixels })
        };
      }
    }
  }).JpegCORE;

  fallbackCore.Config.nativeArithmeticDecode = true;
  const decoded = await fallbackCore.JpegJsCompat.decode(bytes);
  assert.equal(decoded.width, 1);
  assert.equal(decoded.height, 1);
  assert.deepEqual(Array.from(decoded.data), Array.from(fallbackPixels));

  console.log("Arithmetic JPEG fixture test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
