# JPEGcore

Pure JavaScript JPEG encoder/decoder/transform library.

Repository: [Streetblock/JPEGcore](https://github.com/Streetblock/JPEGcore.git)

## Highlights

- Baseline JPEG decode/encode in plain JavaScript
- Progressive JPEG decode path improved and validated
- Utilities for analysis and image transforms
- Works in browser and Node.js

## Install

```bash
npm install jpegcore
```

## Usage (Node)

```js
const JpegCORE = require("jpegcore");
```

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
