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

async function main() {
  const bytes = readFixture("synthetic-420-17x15.jpg");
  const internal = await JpegCORE.Decoder.extractBlocksStruct(new TestBlob([bytes]));
  assert.ok(internal.coeffBuffer instanceof Int32Array, "internal decode should expose coeffBuffer");
  assert.ok(Array.isArray(internal.blockList), "internal decode should expose blockList");
  assert.equal(internal.blockList.length * 64, internal.coeffBuffer.length);
  assert.equal(internal.decodeBackend, "internal");

  const legacy = await JpegCORE.Decoder.extractBlocks(new TestBlob([bytes]));
  assert.ok(Array.isArray(legacy.blocks), "legacy decode should expose blocks");
  assert.ok(legacy.blocks.length > 0);
  assert.ok(legacy.blocks[0].data instanceof Int32Array, "legacy blocks should contain coeff data copies");
  assert.equal(legacy.w, 17);
  assert.equal(legacy.h, 15);

  const originalExtractBlocksStruct = JpegCORE.Decoder.extractBlocksStruct;
  const fallbackPixels = new Uint8ClampedArray([
    1, 2, 3, 255,
    4, 5, 6, 255,
    7, 8, 9, 255,
    10, 11, 12, 255
  ]);

  JpegCORE.Decoder.extractBlocksStruct = async () => ({
    preDecodedData: fallbackPixels,
    w: 2,
    h: 2,
    mode: "RGBA_NATIVE",
    quantTables: {},
    compMap: [],
    isProgressiveFallback: true,
    decodeBackend: "native"
  });

  try {
    const fallbackLegacy = await JpegCORE.Decoder.extractBlocks({});
    assert.equal(fallbackLegacy.blocks.length, 0, "native fallback should expose an empty legacy block list");
    assert.equal(fallbackLegacy.preDecodedData, fallbackPixels, "native fallback pixels should be preserved");
    assert.equal(fallbackLegacy.isProgressiveFallback, true);
    assert.equal(fallbackLegacy.decodeBackend, "native");
  } finally {
    JpegCORE.Decoder.extractBlocksStruct = originalExtractBlocksStruct;
  }

  console.log("JPEG decoder contract tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
