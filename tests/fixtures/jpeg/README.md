# JPEG fixtures

These files are committed test inputs for decoder and metadata regressions. Keep them small, stable, and documented.

| File | Source | License | Purpose | SHA-256 |
| --- | --- | --- | --- | --- |
| `libjpeg-turbo-testorig.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testorig.jpg` | libjpeg-turbo license, BSD-style | Baseline JPEG decode fixture | `acc6ec555d41d15b368320edaa3b20958ee6fa97cb6e4a18d1213d5ae8bec73b` |
| `libjpeg-turbo-testimgint.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testimgint.jpg` | libjpeg-turbo license, BSD-style | Baseline JPEG decode fixture generated through the integer-DCT path | `491679b8057739b3c8e5bacd1e918efb1691d271cbbd69820ff8d480dcb90963` |
| `libjpeg-turbo-testimgari.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testimgari.jpg` | libjpeg-turbo license, BSD-style | Header/probe fixture for a less common JPEG coding variant | `4672c7f08864cd0a8c73a4fa4b66ca32b635d38464551c1ecf06564ae8c89b38` |
| `exif-orientation-landscape-6.jpg` | `recurser/exif-orientation-examples` `Landscape_6.jpg` | MIT | EXIF orientation metadata fixture | `9b344e9f0c869d8637ea22e672df9451d8d3cc1d2d0b291af3b284e538e5f124` |
| `synthetic-gray-8x8.jpg` | `tests/fixtures/generate-synthetic-jpegs.js` | Project license | Small one-component grayscale decode fixture | `0cbae9b85c561f92e136adaacdcbf088bce72943b5082b333573e3565500fefa` |
| `synthetic-444-8x8.jpg` | `tests/fixtures/generate-synthetic-jpegs.js` | Project license | Small 4:4:4 decode fixture | `0cf8f202811268985c3e898808332d5dd3e242fa9251aa94c4a1292c8f3d8573` |
| `synthetic-422-17x9.jpg` | `tests/fixtures/generate-synthetic-jpegs.js` | Project license | Odd-sized 4:2:2 decode fixture | `98efd84161a465a1940dd240bd5e71bc6b6e96b11d7eec0d71493506ace63791` |
| `synthetic-420-17x15.jpg` | `tests/fixtures/generate-synthetic-jpegs.js` | Project license | Odd-sized 4:2:0 decode fixture | `7f5ba0800ba698bd6fd88945ed9b46f74f2c74d28cfafb0ac48c7680b1dfdfdf` |
| `synthetic-420-1x1.jpg` | `tests/fixtures/generate-synthetic-jpegs.js` | Project license | Tiny edge-dimension 4:2:0 decode fixture | `e8f5aabf1f489302253bf2a10a7a1d9c70fa32d43c2c9eb46e5d0faf53e9f3e3` |

Source URLs:

- https://github.com/libjpeg-turbo/libjpeg-turbo/tree/main/testimages
- https://github.com/recurser/exif-orientation-examples
