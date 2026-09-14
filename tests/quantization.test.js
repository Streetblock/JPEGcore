const assert = require("node:assert/strict");
const JpegCORE = require("..");

assert.equal(JpegCORE.Constants.QUANT_L.length, 64);
assert.equal(JpegCORE.Constants.QUANT_C.length, 64);
for (let quality = 1; quality <= 100; quality++) {
  const encoder = new JpegCORE.Encoder(quality);
  for (const table of [encoder.tY, encoder.tC]) {
    assert.equal(table.length, 64);
    for (const q of table) assert.ok(q >= 1 && q <= 255, `quality=${quality}: invalid quantizer ${q}`);
  }
  const bytes = encoder.encodeImageData({ width: 1, height: 1, data: new Uint8ClampedArray([80, 130, 180, 255]) }, "420");
  // Inspect serialized DQT segments independently of our tolerant decoder.
  let tableCount = 0;
  for (let p = 2; p < bytes.length - 3;) {
    const marker = bytes[p + 1];
    if (marker === 0xda) break;
    const length = (bytes[p + 2] << 8) | bytes[p + 3];
    if (marker === 0xdb) {
      for (let start = p + 4; start < p + 2 + length; start += 65) {
        assert.equal(bytes[start] >> 4, 0);
        for (let i = 1; i <= 64; i++) assert.ok(bytes[start + i] > 0);
        tableCount++;
      }
    }
    p += length + 2;
  }
  assert.equal(tableCount, 2);
}
assert.equal(new JpegCORE.Encoder(1).tY[0], 255);
assert.deepEqual(new JpegCORE.Encoder(0).tY, new JpegCORE.Encoder(1).tY);
assert.deepEqual(new JpegCORE.Encoder(101).tY, new JpegCORE.Encoder(100).tY);
assert.deepEqual(new JpegCORE.Encoder().tY, new JpegCORE.Encoder(50).tY);
assert.throws(() => new JpegCORE.Encoder(NaN), RangeError);
async function checkRequantization() {
  for (const dc of [64, -64]) {
    const data = new Int32Array(64);
    data[0] = dc;
    const captured = {
      w: 8, h: 8, mode: "GRAY", blocks: [{ data, type: "Y", comp: 0 }],
      quantTables: { 3: new Uint8Array(64).fill(1) }, compMap: [{ type: 0, tq: 3 }]
    };
    const bytes = new JpegCORE.Encoder(50).save(captured, null, true);
    const decoded = await JpegCORE.JpegJsCompat.decode(bytes);
    for (let i = 0; i < decoded.data.length; i += 4) assert.equal(decoded.data[i], 128 + dc / 8);
    assert.equal(captured.blocks[0].data[0], dc, "saving must not mutate original coefficients");
    assert.throws(() => new JpegCORE.Encoder(50).save({ ...captured, quantTables: undefined }, null, true), /original quantization/);
  }
  const raw = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4).fill(150) };
  const captured = new JpegCORE.Encoder(90).captureBlocks(raw, "444");
  assert.ok(captured.quantTables && captured.compMap, "capture must retain its quantization metadata");
  const image = await JpegCORE.JpegJsCompat.decode(new JpegCORE.Encoder(50).save(captured, null, true));
  assert.ok(Math.abs(image.data[0] - 150) <= 2);
  console.log("JPEG quantization tests passed.");
}
checkRequantization().catch(err => { console.error(err); process.exitCode = 1; });
