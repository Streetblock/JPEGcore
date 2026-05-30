# JPEG fixtures

These files are committed test inputs for decoder and metadata regressions. Keep them small, stable, and documented.

| File | Source | License | Purpose | SHA-256 |
| --- | --- | --- | --- | --- |
| `libjpeg-turbo-testorig.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testorig.jpg` | libjpeg-turbo license, BSD-style | Baseline JPEG decode fixture | `acc6ec555d41d15b368320edaa3b20958ee6fa97cb6e4a18d1213d5ae8bec73b` |
| `libjpeg-turbo-testimgint.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testimgint.jpg` | libjpeg-turbo license, BSD-style | Baseline JPEG decode fixture generated through the integer-DCT path | `491679b8057739b3c8e5bacd1e918efb1691d271cbbd69820ff8d480dcb90963` |
| `libjpeg-turbo-testimgari.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testimgari.jpg` | libjpeg-turbo license, BSD-style | Header/probe fixture for a less common JPEG coding variant | `4672c7f08864cd0a8c73a4fa4b66ca32b635d38464551c1ecf06564ae8c89b38` |
| `exif-orientation-landscape-6.jpg` | `recurser/exif-orientation-examples` `Landscape_6.jpg` | MIT | EXIF orientation metadata fixture | `9b344e9f0c869d8637ea22e672df9451d8d3cc1d2d0b291af3b284e538e5f124` |

Source URLs:

- https://github.com/libjpeg-turbo/libjpeg-turbo/tree/main/testimages
- https://github.com/recurser/exif-orientation-examples
