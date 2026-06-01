const assert = require("node:assert/strict");
const path = require("node:path");
const { loadCore } = require("./helpers/load-core");

const repoRoot = path.resolve(__dirname, "..");
const { JpegCORE } = loadCore(repoRoot);

function makePattern(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = (x * 37 + y * 11) & 255;
      data[i + 1] = (x * 13 + y * 41 + 50) & 255;
      data[i + 2] = (x * 23 + y * 17 + 100) & 255;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

function rgbRmse(expected, actual) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < expected.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = expected[i + c] - actual[i + c];
      sum += diff * diff;
      count++;
    }
    assert.equal(actual[i + 3], 255, "decoded roundtrip alpha must be opaque");
  }
  return Math.sqrt(sum / count);
}

async function main() {
  const cases = [
    { mode: "444", maxRmse: 15 },
    { mode: "422", maxRmse: 35 },
    { mode: "420", maxRmse: 45 }
  ];

  for (const { mode, maxRmse } of cases) {
    const raw = makePattern(17, 15);
    const encoded = JpegCORE.JpegJsCompat.encode(raw, 90, { mode });
    assert.ok(encoded.data.length > 0, `${mode} encode should produce bytes`);
    assert.equal(encoded.width, raw.width);
    assert.equal(encoded.height, raw.height);

    const decoded = await JpegCORE.JpegJsCompat.decode(encoded.data, {
      useTArray: true,
      formatAsRGBA: true
    });
    assert.equal(decoded.width, raw.width);
    assert.equal(decoded.height, raw.height);

    const rmse = rgbRmse(raw.data, decoded.data);
    assert.ok(rmse <= maxRmse, `${mode} roundtrip RMSE ${rmse} exceeded ${maxRmse}`);
  }

  console.log("JPEG encoder roundtrip tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
