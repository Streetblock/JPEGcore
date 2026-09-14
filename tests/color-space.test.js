const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('..');

async function main() {
  // Independent libjpeg-turbo cjpeg -quality 90 -rgb -sample 1x1 fixture.
  const rgb = fs.readFileSync(path.join(__dirname, 'fixtures/jpeg/rgb-components.jpg'));
  const app14 = rgb.indexOf(Buffer.from([0xff, 0xee]));
  assert.ok(app14 >= 2);
  const end = app14 + 2 + rgb.readUInt16BE(app14 + 2);
  const withoutAdobe = Buffer.concat([rgb.subarray(0, app14), rgb.subarray(end)]);
  const numericIds = Buffer.from(rgb);
  const sof = numericIds.indexOf(Buffer.from([0xff, 0xc0]));
  const sos = numericIds.indexOf(Buffer.from([0xff, 0xda]));
  for (let i = 0; i < 3; i++) {
    numericIds[sof + 10 + i * 3] = i + 1;
    numericIds[sos + 5 + i * 2] = i + 1;
  }
  for (const bytes of [rgb, withoutAdobe, numericIds]) {
    await assert.rejects(core.JpegJsCompat.decode(bytes), /Unsupported JPEG color space: RGB/);
    await assert.rejects(core.Decoder.extractBlocksStruct(new Blob([bytes])), /Unsupported JPEG color space: RGB/);
    await assert.rejects(core.Decoder.extractBlocks(new Blob([bytes])), /Unsupported JPEG color space: RGB/);
  }
  const ycbcr = fs.readFileSync(path.join(__dirname, 'fixtures/jpeg/synthetic-444-8x8.jpg'));
  const adobe = Buffer.from(rgb.subarray(app14, end));
  adobe[adobe.length - 1] = 1;
  const markedYcbcr = Buffer.concat([ycbcr.subarray(0, 2), adobe, ycbcr.subarray(2)]);
  assert.deepEqual(await core.JpegJsCompat.decode(markedYcbcr), await core.JpegJsCompat.decode(ycbcr));
  adobe[adobe.length - 1] = 2;
  await assert.rejects(core.JpegJsCompat.decode(Buffer.concat([ycbcr.subarray(0, 2), adobe, ycbcr.subarray(2)])), /Unsupported JPEG color space/);
  console.log('JPEG color-space validation tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
