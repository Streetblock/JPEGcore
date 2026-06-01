# JPEG fixtures

This branch currently carries one arithmetic-coded fixture used to drive arithmetic decoder work.

| File | Source | License | Purpose | SHA-256 |
| --- | --- | --- | --- | --- |
| `libjpeg-turbo-testimgari.jpg` | `libjpeg-turbo/libjpeg-turbo` `testimages/testimgari.jpg` | libjpeg-turbo license, BSD-style | Arithmetic-coded JPEG (`SOF9` + `DAC`) fixture for decoder implementation work | `4672c7f08864cd0a8c73a4fa4b66ca32b635d38464551c1ecf06564ae8c89b38` |

Source URL:

- https://github.com/libjpeg-turbo/libjpeg-turbo/tree/main/testimages

## Golden comparison workflow

1. Generate a libjpeg-turbo reference decode (PPM, RGB):
   - `djpeg -ppm libjpeg-turbo-testimgari.jpg > libjpeg-turbo-testimgari.ref.ppm`
2. Run JpegCORE comparison:
   - `npm run arith:golden -- --fixture tests/fixtures/jpeg/libjpeg-turbo-testimgari.jpg --golden tests/fixtures/jpeg/libjpeg-turbo-testimgari.ref.ppm`
3. Optional export of current JpegCORE output:
   - `npm run arith:golden -- --fixture tests/fixtures/jpeg/libjpeg-turbo-testimgari.jpg --export-core-ppm artifacts/libjpeg-turbo-testimgari.core.ppm`
