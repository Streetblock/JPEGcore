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

console.log("JPEGcore smoke test passed.");
