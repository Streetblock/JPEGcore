# JPEGcore

Pure JavaScript JPEG encoder/decoder/transform library.

Repository: [Streetblock/JPEGcore](https://github.com/Streetblock/JPEGcore.git)

## Highlights

- Baseline JPEG decode/encode in plain JavaScript
- Progressive JPEG decode path improved and validated
- Utilities for analysis and image transforms
- Works in browser and Node.js
- `jpeg-js` compatible decoder wrapper: `JpegCORE.JpegJsCompat.decode(...)`

## Install

```bash
npm install jpegcore
```

## Usage (Node)

```js
const JpegCORE = require("jpegcore");
```

## jpeg-js Decoder Compatibility

```js
const JpegCORE = require("jpegcore");

const decoded = await JpegCORE.JpegJsCompat.decode(inputBuffer, {
  useTArray: true,
  formatAsRGBA: true
});

console.log(decoded.width, decoded.height, decoded.data.length);
```

`decode(...)` returns the same shape as `jpeg-js`: `{ data, width, height }`.

## Performance Note

In a local benchmark with 8 images, 30 rounds and 3 warmups,  
`JpegCORE.JpegJsCompat.decode` reached about `7.839 MPix/s` vs `6.163 MPix/s` for `jpeg-js.decode`  
(about `27.18%` faster in that setup).

## Usage (Browser)

```html
<script src="./JPEGcore.js"></script>
<script>
  // window.JpegCORE is available
</script>
```

## Development

Run smoke test:

```bash
npm test
```

Run local compare test (against jpeg-js reference in `../Referenz`):

```bash
node dev/dev-compare.js
```

## Project Structure

- `JPEGcore.js`: main library
- `benchmarks/`: benchmark HTML and helpers
- `tests/`: automated smoke test
- `dev/`: local debug/compare tooling (for development)

Copyright (c) David Block
