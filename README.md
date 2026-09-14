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

The Node.js wrappers use the built-in `Blob` and do not require a canvas or
`ImageData` polyfill. `Decoder.render(...)` returns a `{ data, width, height }`
pixel object when `ImageData` is unavailable; in browsers it returns native
`ImageData`.

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
