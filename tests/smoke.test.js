const assert = require("node:assert/strict");
const path = require("node:path");
const { loadCore } = require("./helpers/load-core");

const repoRoot = path.resolve(__dirname, "..");
const { JpegCORE } = loadCore(repoRoot);

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
