const assert = require('node:assert/strict');
const core = require('..');

async function main() {
  for (const mode of ['GRAY', '444', '422', '420']) {
    for (const [width, height] of [[16, 16], [17, 19]]) {
      const data = new Uint8Array(width * height * 4);
      for (let i = 0; i < width * height; i++) data.set([(i * 11) % 256, (i * 7) % 256, (i * 3) % 256, 255], i * 4);
      const bytes = new core.Encoder(90).encodeImageData({ width, height, data }, mode);
      for (const operation of [null, 'rotate90', 'flipH', 'flipV']) {
        const flat = await core.Decoder.extractBlocksStruct(new Blob([bytes]));
        const legacy = await core.Decoder.extractBlocks(new Blob([bytes]));
        if (operation) {
          core.Transformer[operation](flat);
          core.Transformer[operation](legacy);
        }
        assert.equal(flat.blocks, undefined);
        const source = flat.coeffBuffer.slice();
        const tables = Object.fromEntries(Object.entries(flat.quantTables).map(([id, table]) => [id, table.slice()]));
        for (const forceNewQuality of [false, true]) {
          const savedFlat = new core.Encoder(50).save(flat, undefined, forceNewQuality);
          const savedLegacy = new core.Encoder(50).save(legacy, undefined, forceNewQuality);
          const label = `${mode} ${width}x${height} ${operation} newQuality=${forceNewQuality}`;
          assert.deepEqual(savedFlat, savedLegacy, label);
          const reopened = await core.JpegJsCompat.decode(savedFlat);
          assert.equal(reopened.width, flat.w, label);
          assert.equal(reopened.height, flat.h, label);
          assert.deepEqual(flat.coeffBuffer, source, 'save must not mutate source coefficients');
          assert.deepEqual(flat.quantTables, tables, 'save must not mutate source tables');
        }
      }
    }
  }
  const encoder = new core.Encoder(90);
  const base = { w: 8, h: 8, mode: 'GRAY', blockList: [{ type: 'Y', comp: 0 }], coeffBuffer: new Int32Array(64) };
  for (const invalid of [
    { ...base, blockList: [] }, { ...base, blockList: undefined },
    { ...base, coeffBuffer: new Int32Array(63) }, { ...base, coeffBuffer: new Int32Array(65) },
    { ...base, coeffBuffer: new Uint8Array(64) },
    { ...base, blockList: [{ comp: 3 }] }, { ...base, blockList: [null] }
  ]) assert.throws(() => encoder.save(invalid), /Encoder.save:/);
  console.log('JPEG flat-buffer save integration tests passed (64 pipeline cases).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
