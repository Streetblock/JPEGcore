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

function averageFullGray(fullImage, x, y, step) {
  let sum = 0;
  for (let yy = 0; yy < step; yy++) {
    for (let xx = 0; xx < step; xx++) {
      sum += fullImage.data[((y * step + yy) * fullImage.width + (x * step + xx)) * 4];
    }
  }
  return Math.round(sum / (step * step));
}

function assertScaledGrayMatchesAveragedFull(scale, step) {
  const data = new Int32Array(64);
  data[0] = 64;
  data[1] = 80;
  data[2] = -40;
  data[8] = -55;
  data[9] = 35;
  data[16] = 24;

  const decoded = {
    blocks: [{ data, type: "Y", comp: 0 }],
    w: 8,
    h: 8,
    mode: "GRAY",
    quantTables: { 0: new Uint8Array(64).fill(1) },
    compMap: [{ type: 0, tq: 0 }]
  };

  const full = JpegCORE.Decoder.render(decoded, 1.0);
  const scaled = JpegCORE.Decoder.render(decoded, scale);
  const expectedSize = 8 / step;

  assert.equal(scaled.width, expectedSize);
  assert.equal(scaled.height, expectedSize);
  for (let y = 0; y < expectedSize; y++) {
    for (let x = 0; x < expectedSize; x++) {
      const actual = scaled.data[(y * scaled.width + x) * 4];
      const expected = averageFullGray(full, x, y, step);
      assert.equal(actual, expected, `${scale * 100}% gray render should average each ${step}x${step} source region`);
    }
  }
}

assertScaledGrayMatchesAveragedFull(0.5, 2);
assertScaledGrayMatchesAveragedFull(0.25, 4);

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

function makeDcBlock(dc) {
  const data = new Int32Array(64);
  data[0] = dc;
  return data;
}

const quarterMcuBlocks = [];
for (const dc of [0, 64, 128, 192]) {
  for (let y = 0; y < 4; y++) {
    quarterMcuBlocks.push({ data: makeDcBlock(dc), type: "Y", comp: 0 });
  }
  quarterMcuBlocks.push({ data: makeDcBlock(0), type: "C", comp: 1 });
  quarterMcuBlocks.push({ data: makeDcBlock(0), type: "C", comp: 2 });
}

const tiny420 = JpegCORE.Decoder.render({
  blocks: quarterMcuBlocks,
  w: 32,
  h: 32,
  mode: "420",
  quantTables: {
    0: new Uint8Array(64).fill(1),
    1: new Uint8Array(64).fill(1)
  },
  compMap: [
    { type: 0, tq: 0 },
    { type: 1, tq: 1 },
    { type: 2, tq: 1 }
  ]
}, 0.125);

assert.equal(tiny420.width, 4);
assert.equal(tiny420.height, 4);
assert.notEqual(tiny420.data[0], tiny420.data[(3 * tiny420.width + 3) * 4], "12.5% render must sample beyond the first MCU");

console.log("JPEG render tests passed.");
