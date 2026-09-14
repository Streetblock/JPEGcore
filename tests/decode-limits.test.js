const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('..');

async function main() {
  const bytes = fs.readFileSync(path.join(__dirname, 'fixtures/jpeg/synthetic-444-8x8.jpg'));
  const calls = [
    opts => core.JpegJsCompat.decode(bytes, opts),
    opts => core.Decoder.extractBlocksStruct(new Blob([bytes]), opts),
    opts => core.Decoder.extractBlocks(new Blob([bytes]), opts)
  ];
  for (const decode of calls) {
    await assert.rejects(decode({ maxResolutionInMP: 63 / 1000000 }), /maxResolutionInMP limit exceeded/);
    await decode({ maxResolutionInMP: 64 / 1000000 });
    await decode({ maxResolutionInMP: 1 });
    await decode({});
    for (const value of [0, -1, NaN, Infinity, '1', null]) {
      await assert.rejects(decode({ maxResolutionInMP: value }), /positive finite number/);
    }
    for (const value of [0.000001, 512]) {
      await assert.rejects(decode({ maxMemoryUsageInMB: value }), /Unsupported JPEG decode option: maxMemoryUsageInMB/);
    }
  }
  // Reject unsupported options before touching/copying an input buffer.
  const unreadable = { get length() { throw Error('Input was accessed'); } };
  await assert.rejects(core.JpegJsCompat.decode(unreadable, { maxMemoryUsageInMB: 512 }), /Unsupported JPEG decode option/);
  const unreadableBlob = { arrayBuffer() { throw Error('Input was read'); } };
  await assert.rejects(core.Decoder.extractBlocksStruct(unreadableBlob, { maxMemoryUsageInMB: 512 }), /Unsupported JPEG decode option/);
  // Progressive/native opt-in must not bypass a caller's resolution limit.
  const progressive = fs.readFileSync(path.join(__dirname, 'fixtures/jpeg/is-progressive-progressive.jpg'));
  const previous = core.Config.nativeProgressiveDecode;
  try {
    core.Config.nativeProgressiveDecode = true;
    await assert.rejects(core.JpegJsCompat.decode(progressive, { maxResolutionInMP: 0.000001 }), /maxResolutionInMP limit exceeded/);
  } finally { core.Config.nativeProgressiveDecode = previous; }
  console.log('JPEG decode resource-option tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
