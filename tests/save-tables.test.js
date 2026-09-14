const assert = require("node:assert/strict");
const core = require("..");

// Rewrite only JPEG headers to give a valid encoded image nonstandard table
// selectors and, optionally, a distinct Cr table. Entropy data is unchanged.
function rewriteTables(bytes, selectors) {
  const parts = [bytes.slice(0, 2)];
  const sourceTables = [];
  for (let p = 2; p < bytes.length;) {
    const marker = bytes[p + 1];
    if (marker === 0xda) { parts.push(bytes.slice(p)); break; }
    const length = (bytes[p + 2] << 8) | bytes[p + 3];
    const segment = bytes.slice(p, p + length + 2);
    if (marker === 0xdb) {
      for (let q = 4; q < segment.length; q += 65) sourceTables[segment[q]] = segment.slice(q + 1, q + 65);
      const ids = [...new Set(selectors)];
      const payload = [];
      for (const id of ids) {
        const comp = selectors.indexOf(id);
        const table = sourceTables[comp === 0 ? 0 : 1];
        payload.push(id, ...Array.from(table, value => Math.min(255, value * (comp === 2 ? 2 : 1))));
      }
      const n = payload.length + 2;
      parts.push(Uint8Array.from([0xff, 0xdb, n >> 8, n & 255, ...payload]));
    } else {
      if (marker === 0xc0) selectors.forEach((id, comp) => { segment[12 + comp * 3] = id; });
      parts.push(segment);
    }
    p += length + 2;
  }
  return Buffer.concat(parts);
}

async function main() {
  for (const mode of ["GRAY", "444", "422", "420"]) {
    const width = 17, height = 15;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) data.set([80 + i % 70, 100 + i % 40, 160 - i % 60, 255], i * 4);
    const encoded = core.JpegJsCompat.encode({ width, height, data }, 90, { mode }).data;
    for (const selectors of mode === "GRAY" ? [[3]] : [[3, 2, 1], [3, 3, 3], [0, 1, 1]]) {
      const input = rewriteTables(encoded, selectors);
      const original = await core.Decoder.extractBlocks(new Blob([input]));
      const pixels = core.Decoder.render(original);
      const saved = new core.Encoder(10).save(original);
      const reopened = await core.Decoder.extractBlocks(new Blob([saved]));
      assert.equal(Object.keys(reopened.quantTables).length, new Set(selectors).size, "emit each distinct table only once");
      for (const comp of original.compMap) {
        const resultMap = reopened.compMap.find(c => c.type === comp.type);
        assert.deepEqual(reopened.quantTables[resultMap.tq], original.quantTables[comp.tq], `${mode} selectors=${selectors} component=${comp.type}: quantizer changed`);
      }
      assert.deepEqual(reopened.blocks.map(b => b.data), original.blocks.map(b => b.data));
      assert.deepEqual(core.Decoder.render(reopened).data, pixels.data, "save without a quality change must preserve rendered pixels");
      const changed = await core.Decoder.extractBlocks(new Blob([new core.Encoder(50).save(original, null, true)]));
      assert.deepEqual(changed.quantTables[changed.compMap[0].tq], new core.Encoder(50).tY);
      for (const comp of changed.compMap.slice(1)) assert.deepEqual(changed.quantTables[comp.tq], new core.Encoder(50).tC);
      const missingTable = { ...original, quantTables: { ...original.quantTables } };
      delete missingTable.quantTables[selectors[0]];
      assert.throws(() => new core.Encoder(90).save(missingTable), /Missing original quantization table/);
      assert.throws(() => new core.Encoder(90).save({
        ...original, quantTables: { ...original.quantTables, [selectors[0]]: new Uint8Array(64) }
      }), /64 quantizers/);
    }
  }
  console.log("JPEG save quantization-table tests passed.");
}
main().catch(err => { console.error(err); process.exitCode = 1; });
