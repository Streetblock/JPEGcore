const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('..');

async function main() {
  const headerOnly = Buffer.from([255,216,255,192,0,11,8,0,8,0,8,1,1,17,0,255,217]);
  const valid = fs.readFileSync(path.join(__dirname, 'fixtures/jpeg/synthetic-444-8x8.jpg'));
  const sos = valid.indexOf(Buffer.from([0xff, 0xda]));
  const entropyStart = sos + 2 + valid.readUInt16BE(sos + 2);
  const invalid = [headerOnly, headerOnly.subarray(0, -2), valid.subarray(0, sos),
    valid.subarray(0, sos + 3), valid.subarray(0, entropyStart),
    Buffer.concat([valid.subarray(0, entropyStart), Buffer.from([255,217])])];
  for (const [offset, value] of [[sos + 3, 5], [sos + 4, 0], [sos + 5, 99], [sos + 7, valid[sos + 5]]]) {
    const bytes = Buffer.from(valid);
    bytes[offset] = value;
    invalid.push(bytes);
  }
  for (const bytes of invalid) {
    await assert.rejects(core.JpegJsCompat.decode(bytes), /Invalid JPEG scan:/);
    await assert.rejects(core.Decoder.extractBlocksStruct(new Blob([bytes])), /Invalid JPEG scan:/);
    await assert.rejects(core.Decoder.extractBlocks(new Blob([bytes])), /Invalid JPEG scan:/);
  }
  const gray = new core.Encoder(90).encodeImageData({ width: 8, height: 8, data: new Uint8Array(8 * 8 * 4).fill(128) }, 'GRAY');
  const image = await core.JpegJsCompat.decode(gray);
  assert.equal(image.width, 8);
  assert.deepEqual(Array.from(image.data.slice(0, 4)), [128, 128, 128, 255]);
  await core.JpegJsCompat.decode(valid);
  console.log('JPEG scan validation tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
