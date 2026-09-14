# JPEGcore

Pure JavaScript JPEG encoder, decoder, and transform library for browser and Node.js.

Repository: [Streetblock/JPEGcore](https://github.com/Streetblock/JPEGcore.git)

## Format Support

| Feature | Status |
| --- | --- |
| Baseline JPEG decode | Supported |
| Baseline JPEG encode | Supported |
| Progressive JPEG decode (Huffman) | Supported |
| Arithmetic JPEG decode `SOF9` (sequential) | Supported |
| Arithmetic JPEG decode `SOF10` (progressive) | Supported |
| `jpeg-js` compatible decode API | Supported (`JpegCORE.JpegJsCompat.decode`) |

Notes:

- `jpeg-js` does not support arithmetic JPEG (`SOF9`/`SOF10`), but JpegCORE does.
- In benchmark UI flows, arithmetic files are marked as reference-unsupported for `jpeg-js`.

## Install

```bash
npm install jpegcore
```

## Usage (Node.js)

```js
const JpegCORE = require("jpegcore");
```

`jpeg-js` compatible wrapper:

```js
const decoded = await JpegCORE.JpegJsCompat.decode(inputBuffer, {
  useTArray: true,
  formatAsRGBA: true
});

console.log(decoded.width, decoded.height, decoded.data.length);
```

`decode(...)` returns the `jpeg-js` shape: `{ data, width, height }`.

`useTArray` defaults to `true`. Set it to `false` to receive a Node.js `Buffer`,
for either RGB or RGBA output. Environments without `Buffer` must use
`useTArray: true`.

The Node.js wrappers use the built-in `Blob` and do not require a canvas or
`ImageData` polyfill. `Decoder.render(...)` returns a `{ data, width, height }`
pixel object when `ImageData` is unavailable; in browsers it returns native
`ImageData`.

Encoder dimensions must be integer numbers from 1 to 65535; invalid dimensions
and mismatched pixel-buffer lengths are rejected before encoding. The decoder's
separate `Constants.MAX_DIMENSION` limit still applies when reading images.
`Decoder.extractBlocks` rejects unsupported or invalid JPEGs with a descriptive
error; `extractBlocksStruct` retains its empty-result fallback for those inputs.

Decoding accepts both 8-bit and 16-bit quantization tables, including mixed
precision tables. This does not add support for 12-bit sample precision.
RGB component JPEGs (identified by Adobe APP14 or RGB component IDs) and
CMYK/YCCK JPEGs are rejected with an explicit unsupported-color-space error.
The decoder currently supports grayscale and YCbCr component data.
Supported sampling is grayscale 1x1 or YCbCr 4:4:4, 4:2:2 and 4:2:0
(chroma factors 1x1). Other sampling layouts, including 4:4:0, are rejected
with an explicit unsupported-sampling error.
The encoder still writes baseline JPEGs with 8-bit quantizers: preserving a
table containing values above 255 with `save` is rejected; request a quality
change with `forceNewQuality` to re-quantize into the baseline range instead.

## Usage (Browser)

```html
<script src="./JPEGcore.js"></script>
<script>
  // window.JpegCORE
</script>
```

## Image transforms

`Transformer.rotate90`, `flipH`, and `flipV` update a decoded image in place.
They transform quantized coefficients without re-encoding whenever the sampling
layout and relevant image edge permit it. Rotation also transposes quantization
tables. Both legacy blocks and the flat coefficient representation are accepted.

When a partial MCU edge would move into the visible image, or a 4:2:2 rotation
would require the unsupported 4:4:0 layout, the default preserves the entire
image by rendering, transforming, and re-encoding it. This can introduce further
JPEG loss and increase file size. Color images use 4:4:4 in this fallback;
grayscale remains grayscale. Original quantization tables are reused when
available, otherwise quality 90 is used. `transformWasReencoded` indicates
whether the most recent transform took this fallback.

To require a lossless transform, pass `{ losslessOnly: true }`. If re-encoding
would be needed, the function throws before modifying the input:

```js
const decoded = await JpegCORE.Decoder.extractBlocks(new Blob([inputBuffer]));
JpegCORE.Transformer.rotate90(decoded, { losslessOnly: true });
const jpegBytes = new JpegCORE.Encoder(90).save(decoded);
```

These operations transform the stored pixels, not EXIF orientation metadata.
Changing EXIF orientation alone is a separate display instruction and requires
the image viewer to honor that metadata.

`Encoder.save(captured, metadata, true)` changes quality by re-quantizing with
the original component tables. Keep the quantization metadata supplied by
`extractBlocks` or `captureBlocks`; changing quality without it throws.
Without a quality change, saving preserves each component's quantization table,
including shared tables, separate Cb/Cr tables, and nonstandard input table IDs.
Output table IDs may be reassigned. Missing referenced tables and quantizers
outside the supported baseline range are rejected instead of silently replaced.

## Build and Test

Build default bundle (with arithmetic decode support):

```bash
npm run build
```

Build bundle without arithmetic decode:

```bash
npm run build:noarith
```

Run test suite:

```bash
npm test
```

Arithmetic golden compare (against libjpeg-turbo reference output):

```bash
npm run arith:golden -- --fixture tests/fixtures/jpeg/libjpeg-turbo-testimgari.jpg --golden tests/fixtures/jpeg/libjpeg-turbo-testimgari.ref.ppm
```

Generate `SOF10` arithmetic fixture:

```bash
npm run fixture:sof10
```

## Benchmarks and Workbench

- `benchmarks/`: benchmark and visual compare UIs.
- `dev/`: local debug and compare tooling.

Local compare helper:

```bash
node dev/dev-compare.js
```

## Fixtures and Licensing

Committed JPEG fixtures (including arithmetic and EXIF-oriented samples) are documented in:

- [tests/fixtures/jpeg/README.md](tests/fixtures/jpeg/README.md)

That file includes fixture sources, licenses, purpose, and SHA-256 checksums.

## Project Structure

- `JPEGcore.js`: bundled library entry point
- `src/`: modular source fragments used by the build
- `scripts/`: build and fixture tooling
- `benchmarks/`: benchmark/workbench HTML
- `tests/`: automated tests and fixtures
- `dev/`: developer compare/debug helpers

Copyright (c) David Block
