const assert = require("node:assert/strict");
const core = require("..");

async function main() {
  const encoder = new core.Encoder(90);
  for (const [width, height] of [[-1, -1], [0, 1], [1, 0], [1.5, 1], [NaN, 1], [1, Infinity], [65536, 1], [4294967297, 1], ["1", 1]]) {
    const raw = { width, height, data: new Uint8Array(4) };
    assert.throws(() => core.JpegJsCompat.encode(raw), /dimensions/i, `wrapper accepted ${width}x${height}`);
    assert.throws(() => encoder.encodeImageData(raw, "444"), /dimensions/i, `direct encoder accepted ${width}x${height}`);
    assert.throws(() => encoder.captureBlocks(raw, "444"), /dimensions/i, `capture accepted ${width}x${height}`);
    assert.throws(() => encoder.save({ w: width, h: height, mode: "GRAY", blocks: [] }), /dimensions/i, `save accepted ${width}x${height}`);
  }
  for (const method of ["encodeImageData", "captureBlocks"]) {
    assert.throws(() => encoder[method]({ width: 8, height: 8, data: new Uint8Array(4) }, "444"), /data length/i);
  }
  for (const bytes of [new Uint8Array(), new Uint8Array([255, 216, 255, 217]), new Uint8Array([1, 2, 3])]) {
    await assert.rejects(core.Decoder.extractBlocks(new Blob([bytes])), err => !(err instanceof TypeError) && /invalid JPEG/i.test(err.message));
  }
  const valid = core.JpegJsCompat.encode({ width: 1, height: 1, data: new Uint8Array([20, 30, 40, 255]) });
  const decoded = await core.JpegJsCompat.decode(valid.data);
  assert.equal(decoded.width, 1);
  assert.equal(decoded.height, 1);
  console.log("JPEG input validation tests passed.");
}
main().catch(err => { console.error(err); process.exitCode = 1; });
