const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("..");

// Widen the committed progressive fixture's DQT entries, keeping entropy
// bytes unchanged. Table 0 can also contain genuinely wide (>255) values.
function widenTables(bytes, large = false) {
  const parts = [bytes.subarray(0, 2)];
  for (let p = 2; p < bytes.length;) {
    const marker = bytes[p + 1];
    if (marker === 0xda) { parts.push(bytes.subarray(p)); break; }
    const len = (bytes[p + 2] << 8) | bytes[p + 3];
    if (marker === 0xdb) {
      const payload = [];
      for (let q = p + 4; q < p + len + 2; q += 65) {
        const id = bytes[q];
        // Mixing 8- and 16-bit tables also checks segment alignment.
        payload.push(id | (id === 0 ? 0x10 : 0));
        for (let k = 1; k <= 64; k++) {
          const value = bytes[q + k] + (large && id === 0 ? 256 : 0);
          if (id === 0) payload.push(value >> 8);
          payload.push(value & 255);
        }
      }
      const size = payload.length + 2;
      parts.push(Buffer.from([255, 219, size >> 8, size & 255, ...payload]));
    } else parts.push(bytes.subarray(p, p + len + 2));
    p += len + 2;
  }
  return Buffer.concat(parts);
}

async function main() {
  for (const mode of ["GRAY", "444", "422", "420"]) {
    const original = fs.readFileSync(path.join(__dirname, `fixtures/jpeg/restart/progressive-${mode}-rst0.jpg`));
    const base = await core.Decoder.extractBlocksStruct(new Blob([original]));
    for (const large of [false, true]) {
      const bytes = widenTables(original, large);
      const decoded = await core.Decoder.extractBlocksStruct(new Blob([bytes]));
      const expectedQT = Uint16Array.from(base.quantTables[0], q => q + (large ? 256 : 0));
      assert.deepEqual(Array.from(decoded.quantTables[0]), Array.from(expectedQT));
      assert.equal(decoded.quantTables[0].BYTES_PER_ELEMENT, 2);
      assert.deepEqual(decoded.coeffBuffer, base.coeffBuffer, "DQT precision must not change entropy decoding");
      const expected = core.Decoder.render({ ...base, quantTables: { ...base.quantTables, 0: expectedQT } });
      assert.deepEqual(core.Decoder.render(decoded).data, expected.data);
      const probe = await core.Analysis.probe(new Blob([bytes]));
      assert.deepEqual(Array.from(probe.customQtL), Array.from(expectedQT));
      if (mode !== "GRAY") assert.deepEqual(decoded.quantTables[1], base.quantTables[1]);
    }
  }
  console.log("JPEG 16-bit quantization tests passed.");
}
main().catch(err => { console.error(err); process.exitCode = 1; });
