const assert = require("node:assert/strict");
const path = require("node:path");
const { loadCore } = require("./helpers/load-core");

const repoRoot = path.resolve(__dirname, "..");
const { JpegCORE } = loadCore(repoRoot);

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

const fallbackPixels = new Uint8ClampedArray([
  1, 2, 3, 255,
  4, 5, 6, 255,
  7, 8, 9, 255,
  10, 11, 12, 255
]);
const fallbackRender = JpegCORE.Decoder.render({
  preDecodedData: fallbackPixels,
  w: 2,
  h: 2,
  mode: "RGBA_NATIVE"
}, 1.0);

assert.equal(fallbackRender.width, 2);
assert.equal(fallbackRender.height, 2);
assert.deepEqual(Array.from(fallbackRender.data), Array.from(fallbackPixels));

console.log("JPEG render tests passed.");
