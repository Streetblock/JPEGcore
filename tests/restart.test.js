const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const core = require("..");
const dir = path.join(__dirname, "fixtures/jpeg/restart");
const hashes = require("./fixtures/jpeg/restart/sha256.json");
async function main() {
  for (const mode of ["GRAY", "444", "422", "420"]) {
    for (const coding of ["baseline", "progressive"]) {
      let reference;
      for (const interval of [0, 1, 3]) {
        const name = `${coding}-${mode}-rst${interval}.jpg`;
        const bytes = fs.readFileSync(path.join(dir, name));
        assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), hashes[name]);
        const decoded = await core.Decoder.extractBlocksStruct(new Blob([bytes]));
        assert.equal(decoded.w, 33);
        assert.equal(decoded.h, 19);
        assert.equal(decoded.mode, mode);
        assert.equal(decoded.restartIntervalMCUs, interval);
        assert.ok(decoded.coeffBuffer.some(v => v !== 0));
        if (!reference) reference = decoded;
        else {
          assert.equal(decoded.coeffBuffer.length, reference.coeffBuffer.length);
          for (let i = 0; i < decoded.coeffBuffer.length; i++) {
            assert.equal(decoded.coeffBuffer[i], reference.coeffBuffer[i], `${name}: coefficient ${i} changed`);
          }
        }
      }
    }
  }
  console.log("JPEG restart interval tests passed.");
}
main().catch(err => { console.error(err); process.exitCode = 1; });
