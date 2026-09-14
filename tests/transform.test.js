const assert = require("node:assert/strict");
const core = require("..");

function makeImage(mode, cols, rows) {
  const sm = core.Constants.SAMPLE_MODES[mode];
  const q = new Uint8Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) q[y * 8 + x] = 1 + (x + y * 3) % 7;
  const blocks = [];
  for (let m = 0; m < cols * rows; m++) for (let b = 0; b < sm.blocks.length; b++) {
    const def = sm.blocks[b];
    const data = new Int32Array(64);
    data[0] = ((m * 7 + b * 3) % 17 - 8) * 8;
    data[1] = 5; data[8] = -3; data[9] = 2;
    blocks.push({ data, type: def.t, comp: def.t === "Y" ? 0 : def.c + 1 });
  }
  return { blocks, w: cols * sm.hMax * 8, h: rows * sm.vMax * 8, mode,
    quantTables: { 0: q, 1: q }, compMap: [0, 1, 2].map(type => ({ type, tq: type ? 1 : 0 })) };
}

function transformPixels(image, operation) {
  const width = operation === "rotate90" ? image.height : image.width;
  const height = operation === "rotate90" ? image.width : image.height;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = operation === "flipH" ? image.width - 1 - x : operation === "rotate90" ? y : x;
    const sy = operation === "flipV" ? image.height - 1 - y : operation === "rotate90" ? image.height - 1 - x : y;
    const offset = (sy * image.width + sx) * 4;
    data.set(image.data.subarray(offset, offset + 4), (y * width + x) * 4);
  }
  return { width, height, data };
}

for (const mode of ["GRAY", "444", "422", "420"]) {
  for (const operation of ["flipH", "flipV", "rotate90"]) {
    if (mode === "422" && operation === "rotate90") continue;
    const decoded = makeImage(mode, 2, 3);
    const expected = transformPixels(core.Decoder.render(decoded), operation);
    const originalTable = decoded.quantTables[0];
    const savedTable = originalTable.slice();
    assert.equal(core.Transformer[operation](decoded), decoded, "transform API should retain its in-place contract");
    const result = core.Decoder.render(decoded);
    assert.equal(result.width, expected.width);
    assert.equal(result.height, expected.height);
    for (let i = 0; i < result.data.length; i++) {
      assert.ok(Math.abs(result.data[i] - expected.data[i]) <= 3, `${mode} ${operation} pixel channel ${i}: ${result.data[i]} vs ${expected.data[i]}`);
    }
    assert.deepEqual(originalTable, savedTable, "transform should not mutate shared input tables");
    assert.equal(decoded.quantTables[0], decoded.quantTables[1], "table aliases should remain consistent");
  }
}
function asFlat(decoded) {
  decoded.coeffBuffer = new Int32Array(decoded.blocks.length * 64);
  decoded.blocks.forEach((block, i) => decoded.coeffBuffer.set(block.data, i * 64));
  decoded.blockList = decoded.blocks.map(({ type, comp }) => ({ type, comp }));
  delete decoded.blocks;
  return decoded;
}

async function checkFallbacks() {
  for (const mode of ["GRAY", "444", "422", "420"]) {
    for (const operation of ["flipH", "flipV", "rotate90"]) {
      for (const [w, h] of [[1, 1], [9, 8], [17, 15], [31, 17]]) {
        for (const flat of [false, true]) {
          const sm = core.Constants.SAMPLE_MODES[mode];
          const decoded = makeImage(mode, Math.ceil(w / (sm.hMax * 8)), Math.ceil(h / (sm.vMax * 8)));
          decoded.w = w; decoded.h = h;
          if (flat) asFlat(decoded);
          const expected = transformPixels(core.Decoder.render(decoded), operation);
          core.Transformer[operation](decoded);
          const actual = core.Decoder.render(decoded);
          assert.equal(actual.width, expected.width);
          assert.equal(actual.height, expected.height);
          let totalError = 0;
          for (let i = 0; i < actual.data.length; i++) {
            if (i % 4 === 3) assert.equal(actual.data[i], 255);
            else totalError += Math.abs(actual.data[i] - expected.data[i]);
          }
          assert.ok(totalError / (w * h * 3) <= 2, `${mode} ${w}x${h} ${operation}: mean error ${totalError / (w * h * 3)}`);
          if (!flat) {
            const saved = new core.Encoder(90).save(decoded);
            const reopened = await core.JpegJsCompat.decode(saved);
            assert.equal(reopened.width, actual.width);
            assert.equal(reopened.height, actual.height);
            assert.deepEqual(reopened.data, actual.data, "saving transformed blocks must retain their rendered pixels");
          }
        }
      }
    }
  }

  for (const mode of ["GRAY", "444", "420"]) {
    const decoded = asFlat(makeImage(mode, 2, 3));
    const original = decoded.coeffBuffer.slice();
    const qt = decoded.quantTables[0].slice();
    for (let i = 0; i < 4; i++) core.Transformer.rotate90(decoded, { losslessOnly: true });
    assert.deepEqual(decoded.coeffBuffer, original, "four lossless rotations must preserve coefficients exactly");
    assert.deepEqual(decoded.quantTables[0], qt);
  }
  for (const [mode, operation, w, h] of [["GRAY", "flipH", 9, 8], ["420", "flipV", 16, 15], ["422", "rotate90", 16, 8]]) {
    const decoded = makeImage(mode, 2, 2);
    decoded.w = w; decoded.h = h;
    const snapshot = structuredClone(decoded);
    assert.throws(() => core.Transformer[operation](decoded, { losslessOnly: true }), /requires re-encoding/);
    assert.deepEqual(decoded, snapshot, "rejected transforms must leave input untouched");
  }
  const edge = makeImage("GRAY", 2, 1);
  edge.w = 9;
  edge.quantTables[0].fill(1);
  edge.blocks[0].data.fill(0);
  edge.blocks[1].data.fill(0); edge.blocks[1].data[0] = 640;
  core.Transformer.flipH(edge);
  const pixels = core.Decoder.render(edge);
  assert.equal(edge.transformWasReencoded, true);
  assert.ok(Math.abs(pixels.data[0] - 208) <= 1);
  for (let x = 1; x < 9; x++) assert.ok(Math.abs(pixels.data[x * 4] - 128) <= 1, "padding must not become visible");
  console.log("JPEG transform tests passed.");
}
checkFallbacks().catch(err => { console.error(err); process.exitCode = 1; });
