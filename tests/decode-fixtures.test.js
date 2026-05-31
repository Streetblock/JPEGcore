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

function assertGrayImage(decoded, width, height) {
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  assert.equal(decoded.data.length, width * height * 4);

  for (let i = 0; i < decoded.data.length; i += 4) {
    assert.equal(decoded.data[i], decoded.data[i + 1], "GRAY decode must keep R and G equal");
    assert.equal(decoded.data[i], decoded.data[i + 2], "GRAY decode must keep R and B equal");
    assert.equal(decoded.data[i + 3], 255, "GRAY decode must write opaque alpha");
  }
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

  const syntheticFixtures = [
    ["synthetic-444-8x8.jpg", "444", 8, 8],
    ["synthetic-422-17x9.jpg", "422", 17, 9],
    ["synthetic-420-17x15.jpg", "420", 17, 15],
    ["synthetic-420-1x1.jpg", "420", 1, 1]
  ];

  for (const [fixture, mode, width, height] of syntheticFixtures) {
    const bytes = readFixture(fixture);
    const probe = await JpegCORE.Analysis.probe(new TestBlob([bytes]));
    assert.equal(probe.detectedMode, mode, `${fixture} should probe as ${mode}`);

    const decoded = await JpegCORE.JpegJsCompat.decode(bytes, {
      useTArray: true,
      formatAsRGBA: true
    });
    if (width * height === 1) {
      assert.equal(decoded.width, width);
      assert.equal(decoded.height, height);
      assert.equal(decoded.data.length, width * height * 4);
      assert.equal(decoded.data[3], 255);
    } else {
      assertDecodedImage(decoded, width, height);
    }
  }

  const grayBytes = readFixture("synthetic-gray-8x8.jpg");
  const grayProbe = await JpegCORE.Analysis.probe(new TestBlob([grayBytes]));
  assert.equal(grayProbe.detectedMode, "GRAY", "synthetic-gray-8x8.jpg should probe as GRAY");

  const grayDecoded = await JpegCORE.JpegJsCompat.decode(grayBytes, {
    useTArray: true,
    formatAsRGBA: true
  });
  assertGrayImage(grayDecoded, 8, 8);

  const arithmeticProbe = await JpegCORE.Analysis.probe(
    new TestBlob([readFixture("libjpeg-turbo-testimgari.jpg")])
  );
  assert.equal(arithmeticProbe.detectedMode, "420");
  assert.equal(arithmeticProbe.detectedArithmetic, true);
  await assert.rejects(
    () => JpegCORE.JpegJsCompat.decode(readFixture("libjpeg-turbo-testimgari.jpg")),
    /unsupported or invalid JPEG/
  );

  const exifProbe = await JpegCORE.Analysis.probe(
    new TestBlob([readFixture("exif-orientation-landscape-6.jpg")])
  );
  assert.equal(exifProbe.detectedMode, "420");
  assert.equal(exifProbe.detectedOrientation, 6);

  const baselineProbe = await JpegCORE.Analysis.probe(
    new TestBlob([readFixture("is-progressive-baseline.jpg")])
  );
  assert.equal(baselineProbe.detectedMode, "444");
  assert.equal(baselineProbe.detectedProgressive, false);

  const progressiveBytes = readFixture("is-progressive-progressive.jpg");
  const progressiveProbe = await JpegCORE.Analysis.probe(new TestBlob([progressiveBytes]));
  assert.equal(progressiveProbe.detectedMode, "444");
  assert.equal(progressiveProbe.detectedProgressive, true);
  const progressiveDecoded = await JpegCORE.JpegJsCompat.decode(progressiveBytes, {
    useTArray: true,
    formatAsRGBA: true
  });
  assertDecodedImage(progressiveDecoded, 200, 133);

  const curiousExifBytes = readFixture("is-progressive-curious-exif.jpg");
  const curiousExifProbe = await JpegCORE.Analysis.probe(new TestBlob([curiousExifBytes]));
  assert.equal(curiousExifProbe.detectedMode, "420");
  assert.equal(curiousExifProbe.detectedProgressive, true);
  assert.equal(curiousExifProbe.detectedOrientation, 1);
  assert.ok(curiousExifProbe.detectedMetaSegments.length >= 4);
  const curiousExifDecoded = await JpegCORE.JpegJsCompat.decode(curiousExifBytes, {
    useTArray: true,
    formatAsRGBA: true
  });
  assertDecodedImage(curiousExifDecoded, 204, 137);

  console.log("JPEG fixture decode tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
