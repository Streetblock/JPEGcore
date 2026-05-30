const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "JPEGcore.js");
const source = fs.readFileSync(sourcePath, "utf8");

const context = {
  console,
  setTimeout,
  clearTimeout,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  ArrayBuffer,
  DataView,
  Blob: class Blob {},
  FileReader: class FileReader {},
  ImageData: class ImageData {
    constructor(dataOrWidth, width, height) {
      if (typeof dataOrWidth === "number") {
        this.width = dataOrWidth;
        this.height = width;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = width;
        this.height = height;
      }
    }
  },
  atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
  btoa: (str) => Buffer.from(str, "binary").toString("base64")
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "JPEGcore.js" });
const JpegCORE = vm.runInContext("JpegCORE", context);

assert.ok(JpegCORE, "JpegCORE must be defined");
assert.equal(typeof JpegCORE, "object");

assert.ok(JpegCORE.Constants, "Constants module missing");
assert.ok(JpegCORE.Utils, "Utils module missing");
assert.ok(JpegCORE.Decoder, "Decoder module missing");
assert.ok(JpegCORE.Encoder, "Encoder module missing");
assert.ok(JpegCORE.Analysis, "Analysis module missing");
assert.ok(JpegCORE.Transformer, "Transformer module missing");
assert.ok(JpegCORE.Glitch, "Glitch module missing");

assert.equal(typeof JpegCORE.Decoder.extractBlocksStruct, "function", "Decoder.extractBlocksStruct missing");
assert.equal(typeof JpegCORE.Decoder.render, "function", "Decoder.render missing");
assert.equal(typeof JpegCORE.Analysis.probe, "function", "Analysis.probe missing");
assert.equal(typeof JpegCORE.Transformer.rotate90, "function", "Transformer.rotate90 missing");
assert.equal(typeof JpegCORE.Glitch.swapChannels, "function", "Glitch.swapChannels missing");

const flatGrayBlock = {
  coeffBuffer: new Int32Array(64),
  blockList: [{ type: "Y", comp: 0 }],
  w: 8,
  h: 8,
  mode: "GRAY",
  quantTables: { 0: new Uint8Array(64).fill(1) },
  compMap: [{ type: 0, tq: 0 }]
};
const grayImage = JpegCORE.Decoder.render(flatGrayBlock, 1.0);
assert.equal(grayImage.width, 8);
assert.equal(grayImage.height, 8);
for (let i = 0; i < grayImage.data.length; i += 4) {
  assert.equal(grayImage.data[i], grayImage.data[i + 1], "GRAY render must keep R and G equal");
  assert.equal(grayImage.data[i], grayImage.data[i + 2], "GRAY render must keep R and B equal");
  assert.equal(grayImage.data[i + 3], 255, "GRAY render must write opaque alpha");
}

console.log("JPEGcore smoke test passed.");
