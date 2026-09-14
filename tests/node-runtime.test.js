const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
// Exercise the real package entry in Node, without the VM/browser polyfills.
const JpegCORE = require("..");

async function main() {
  assert.equal(typeof JpegCORE.JpegJsCompat?.decode, "function", "package must export its decode API");
  const bytes = fs.readFileSync(path.join(__dirname, "fixtures/jpeg/synthetic-420-17x15.jpg"));
  // A view with nonzero offset must not accidentally decode its backing buffer.
  const padded = Buffer.concat([Buffer.from([1, 2, 3]), bytes, Buffer.from([4, 5])]);
  const inputs = [
    bytes,
    new Uint8Array(padded.buffer, padded.byteOffset + 3, bytes.length),
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    new Blob([bytes], { type: "image/jpeg" })
  ];
  let reference;
  for (const input of inputs) {
    const image = await JpegCORE.JpegJsCompat.decode(input);
    assert.equal(image.width, 17);
    assert.equal(image.height, 15);
    assert.equal(image.data.length, 17 * 15 * 4);
    assert.ok(image.data instanceof Uint8ClampedArray);
    if (reference) assert.deepEqual(image.data, reference);
    reference = image.data;
  }
  const progressive = fs.readFileSync(path.join(__dirname, "fixtures/jpeg/is-progressive-progressive.jpg"));
  const image = await JpegCORE.JpegJsCompat.decode(progressive);
  assert.ok(image.width > 0 && image.height > 0);
  assert.equal(image.data.length, image.width * image.height * 4);

  const decoded = await JpegCORE.Decoder.extractBlocksStruct(new Blob([bytes]));
  for (const scale of [1, 0.5, 0.25, 0.125]) {
    const rendered = JpegCORE.Decoder.render(decoded, scale);
    assert.equal(rendered.width, Math.ceil(17 * scale));
    assert.equal(rendered.height, Math.ceil(15 * scale));
    assert.equal(rendered.data.length, rendered.width * rendered.height * 4);
  }
  const nativePixels = JpegCORE.Decoder.render({ preDecodedData: new Uint8ClampedArray([20, 30, 40, 255]), w: 1, h: 1 });
  assert.deepEqual(Array.from(nativePixels.data), [20, 30, 40, 255]);
  const empty = JpegCORE.Decoder.render(null);
  assert.equal(empty.width, 1);
  assert.equal(empty.height, 1);
  assert.equal(empty.data.length, 4);

  for (const channels of [3, 4]) {
    const width = 17, height = 15;
    const data = Buffer.alloc(width * height * channels);
    for (let i = 0; i < data.length; i += channels) {
      data[i] = 80; data[i + 1] = 130; data[i + 2] = 180;
      if (channels === 4) data[i + 3] = 255;
    }
    for (const mode of ["444", "422", "420"]) {
      const encoded = JpegCORE.JpegJsCompat.encode({ width, height, data }, 90, { mode });
      const roundtrip = await JpegCORE.JpegJsCompat.decode(encoded.data);
      assert.equal(roundtrip.width, width);
      assert.equal(roundtrip.height, height);
      for (let i = 0; i < roundtrip.data.length; i += 4) {
        for (let c = 0; c < 3; c++) assert.ok(Math.abs(roundtrip.data[i + c] - [80, 130, 180][c]) <= 3);
        assert.equal(roundtrip.data[i + 3], 255);
      }
    }
  }
  console.log("JPEG Node runtime integration tests passed.");
}

main().catch(err => { console.error(err); process.exitCode = 1; });
