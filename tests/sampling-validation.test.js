const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('..');
const read = name => fs.readFileSync(path.join(__dirname, 'fixtures/jpeg', name));

async function main() {
  // Independently encoded by libjpeg-turbo cjpeg -quality 90 -sample 1x2.
  const vertical = read('sampling-440.jpg');
  const regular = read('synthetic-444-8x8.jpg');
  const invalid = [vertical];
  for (const [component, sampling] of [[0, 0x31], [0, 0x00], [1, 0x22], [2, 0x21]]) {
    const bytes = Buffer.from(regular);
    const sof = bytes.indexOf(Buffer.from([0xff, 0xc0]));
    bytes[sof + 11 + component * 3] = sampling;
    invalid.push(bytes);
  }
  for (const bytes of invalid) {
    await assert.rejects(core.JpegJsCompat.decode(bytes), /Unsupported JPEG sampling/);
    await assert.rejects(core.Decoder.extractBlocksStruct(new Blob([bytes])), /Unsupported JPEG sampling/);
    await assert.rejects(core.Decoder.extractBlocks(new Blob([bytes])), /Unsupported JPEG sampling/);
  }
  for (const mode of ['GRAY', '444', '422', '420']) {
    const raw = { width: 17, height: 19, data: new Uint8Array(17 * 19 * 4).fill(128) };
    const bytes = new core.Encoder(90).encodeImageData(raw, mode);
    const decoded = await core.Decoder.extractBlocksStruct(new Blob([bytes]));
    assert.equal(decoded.mode, mode);
    assert.equal(decoded.w, 17);
    assert.equal(decoded.h, 19);
  }
  console.log('JPEG sampling validation tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
