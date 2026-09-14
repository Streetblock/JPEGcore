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

// Compare reduced renders with independently averaged full-size pixels. Keep
// chroma constant within each MCU and avoid clipping, so RGB averaging remains
// equivalent to component averaging (apart from integer rounding).
for (const mode of ["GRAY", "444", "422", "420"]) {
  const sm = JpegCORE.Constants.SAMPLE_MODES[mode];
  for (const [width, height] of [[1, 1], [9, 7], [17, 15], [31, 17], [33, 35]]) {
    const cols = Math.ceil(width / (sm.hMax * 8));
    const rows = Math.ceil(height / (sm.vMax * 8));
    const blocks = [];
    for (let m = 0; m < cols * rows; m++) {
      for (let b = 0; b < sm.blocks.length; b++) {
        const def = sm.blocks[b];
        const comp = def.t === "Y" ? 0 : def.c + 1;
        const data = makeDcBlock(((m * 7 + b * 3) % 17 - 8) * 8);
        if (comp === 0) {
          data[1] = 12;
          data[8] = -8;
        }
        blocks.push({ data, type: def.t, comp });
      }
    }
    const decoded = {
      blocks, w: width, h: height, mode,
      quantTables: { 0: new Uint8Array(64).fill(1) },
      compMap: [0, 1, 2].map(type => ({ type, tq: 0 }))
    };
    // Include the encoded edge padding in the averaging reference.
    const padded = JpegCORE.Decoder.render({
      ...decoded, w: cols * sm.hMax * 8, h: rows * sm.vMax * 8
    });
    const coeffBuffer = new Int32Array(blocks.length * 64);
    blocks.forEach((block, i) => coeffBuffer.set(block.data, i * 64));
    for (const scale of [0.5, 0.25, 0.125]) {
      const step = 1 / scale;
      const legacy = JpegCORE.Decoder.render(decoded, scale);
      const flat = JpegCORE.Decoder.render({
        ...decoded, blocks: undefined, coeffBuffer,
        blockList: blocks.map(({ type, comp }) => ({ type, comp }))
      }, scale);
      assert.equal(legacy.width, Math.ceil(width * scale));
      assert.equal(legacy.height, Math.ceil(height * scale));
      assert.deepEqual(flat.data, legacy.data, "flat and legacy scaled renders must agree");
      for (let y = 0; y < legacy.height; y++) {
        for (let x = 0; x < legacy.width; x++) {
          const offset = (y * legacy.width + x) * 4;
          assert.equal(legacy.data[offset + 3], 255);
          for (let channel = 0; channel < 3; channel++) {
            let sum = 0;
            for (let dy = 0; dy < step; dy++) {
              for (let dx = 0; dx < step; dx++) {
                sum += padded.data[((y * step + dy) * padded.width + x * step + dx) * 4 + channel];
              }
            }
            const expected = Math.round(sum / (step * step));
            assert.ok(Math.abs(legacy.data[offset + channel] - expected) <= 2,
              `${mode} ${width}x${height} scale=${scale} pixel=${x},${y} channel=${channel}: ${legacy.data[offset + channel]} vs ${expected}`);
          }
        }
      }
    }
  }
}

console.log("JPEG render tests passed.");
