const assert = require("node:assert/strict");
const path = require("node:path");
const { loadCore } = require("./helpers/load-core");

const repoRoot = path.resolve(__dirname, "..");
const { JpegCORE } = loadCore(repoRoot);

assert.ok(JpegCORE, "JpegCORE must be defined");
assert.equal(typeof JpegCORE, "object");

assert.ok(JpegCORE.Constants, "Constants module missing");
assert.ok(JpegCORE.Utils, "Utils module missing");
assert.ok(JpegCORE.Decoder, "Decoder module missing");
assert.ok(JpegCORE.Encoder, "Encoder module missing");
assert.ok(JpegCORE.Analysis, "Analysis module missing");
assert.ok(JpegCORE.Transformer, "Transformer module missing");
assert.ok(JpegCORE.Glitch, "Glitch module missing");

assert.equal(typeof JpegCORE.Decoder.extractBlocksStruct, "function", "Decoder.extractBlocksStruct missing");
assert.equal(typeof JpegCORE.Decoder.render, "function", "Decoder.render missing");
assert.equal(typeof JpegCORE.Analysis.probe, "function", "Analysis.probe missing");
assert.equal(typeof JpegCORE.Transformer.rotate90, "function", "Transformer.rotate90 missing");
assert.equal(typeof JpegCORE.Glitch.swapChannels, "function", "Glitch.swapChannels missing");

const flatGrayBlock = {
  coeffBuffer: new Int32Array(64),
  blockList: [{ type: "Y", comp: 0 }],
  w: 8,
  h: 8,
  mode: "GRAY",
  quantTables: { 0: new Uint8Array(64).fill(1) },
  compMap: [{ type: 0, tq: 0 }]
};
const grayImage = JpegCORE.Decoder.render(flatGrayBlock, 1.0);
assert.equal(grayImage.width, 8);
assert.equal(grayImage.height, 8);
for (let i = 0; i < grayImage.data.length; i += 4) {
  assert.equal(grayImage.data[i], grayImage.data[i + 1], "GRAY render must keep R and G equal");
  assert.equal(grayImage.data[i], grayImage.data[i + 2], "GRAY render must keep R and B equal");
  assert.equal(grayImage.data[i + 3], 255, "GRAY render must write opaque alpha");
}

async function runAsyncChecks() {
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
    const legacyResult = await JpegCORE.Decoder.extractBlocks({});
    assert.equal(legacyResult.blocks.length, 0, "native fallback should expose an empty legacy block list");
    assert.equal(legacyResult.preDecodedData, fallbackPixels, "native fallback pixels should be preserved");
    assert.equal(legacyResult.isProgressiveFallback, true);

    const rendered = JpegCORE.Decoder.render(legacyResult, 1.0);
    assert.equal(rendered.width, 2);
    assert.equal(rendered.height, 2);
    assert.deepEqual(Array.from(rendered.data), Array.from(fallbackPixels));
  } finally {
    JpegCORE.Decoder.extractBlocksStruct = originalExtractBlocksStruct;
  }
}

runAsyncChecks()
  .then(() => {
    console.log("JPEGcore smoke test passed.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
