const fs = require("node:fs");
const path = require("node:path");
const { loadCore } = require("../helpers/load-core");

const repoRoot = path.resolve(__dirname, "..", "..");
const outputDir = path.join(__dirname, "jpeg");
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

function writeFixture(name, width, height, mode, quality = 90) {
  const encoded = JpegCORE.JpegJsCompat.encode(makePattern(width, height), quality, { mode });
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(encoded.data));
}

fs.mkdirSync(outputDir, { recursive: true });

writeFixture("synthetic-gray-8x8.jpg", 8, 8, "GRAY");
writeFixture("synthetic-444-8x8.jpg", 8, 8, "444");
writeFixture("synthetic-422-17x9.jpg", 17, 9, "422");
writeFixture("synthetic-420-17x15.jpg", 17, 15, "420");
writeFixture("synthetic-420-1x1.jpg", 1, 1, "420");
