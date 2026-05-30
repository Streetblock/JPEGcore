const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadCore, TestBlob } = require("./helpers/load-core");

const repoRoot = path.resolve(__dirname, "..");
const fixturesDir = path.join(__dirname, "fixtures", "jpeg");
const { JpegCORE } = loadCore(repoRoot);

function readFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name));
}

function assertDecodedImage(decoded, width, height) {
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  assert.equal(decoded.data.length, width * height * 4);

  let min = 255;
  let max = 0;
  for (let i = 0; i < decoded.data.length; i += 4) {
    min = Math.min(min, decoded.data[i], decoded.data[i + 1], decoded.data[i + 2]);
    max = Math.max(max, decoded.data[i], decoded.data[i + 1], decoded.data[i + 2]);
    assert.equal(decoded.data[i + 3], 255, "decoded RGBA output must be opaque");
  }
  assert.ok(max > min, "decoded image should contain non-uniform RGB data");
}

async function main() {
  const baselineFixtures = [
    "libjpeg-turbo-testorig.jpg",
    "libjpeg-turbo-testimgint.jpg"
  ];

  for (const fixture of baselineFixtures) {
    const bytes = readFixture(fixture);
    const probe = await JpegCORE.Analysis.probe(new TestBlob([bytes]));
    assert.equal(probe.detectedMode, "420", `${fixture} should probe as 4:2:0`);

    const decoded = await JpegCORE.JpegJsCompat.decode(bytes, {
      useTArray: true,
      formatAsRGBA: true
    });
    assertDecodedImage(decoded, 227, 149);
  }

  const arithmeticProbe = await JpegCORE.Analysis.probe(
    new TestBlob([readFixture("libjpeg-turbo-testimgari.jpg")])
  );
  assert.equal(arithmeticProbe.detectedMode, "420");

  const exifProbe = await JpegCORE.Analysis.probe(
    new TestBlob([readFixture("exif-orientation-landscape-6.jpg")])
  );
  assert.equal(exifProbe.detectedMode, "420");
  assert.equal(exifProbe.detectedOrientation, 6);

  console.log("JPEG fixture decode tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
