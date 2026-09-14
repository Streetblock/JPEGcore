# Changelog

## Unreleased

- Decoded 16-bit quantization tables without truncation and exposed them through image analysis.
- Validated encoder dimensions and pixel-buffer lengths before processing input.
- Replaced the legacy decoder's invalid-input TypeError with a descriptive JPEG error.
- Returned Node.js Buffers consistently for explicit useTArray: false in RGB and RGBA modes.

- Fixed reduced-scale rendering at 50%, 25%, and 12.5%, including odd dimensions and subsampled color.
- Exported the CommonJS package and removed the Node.js requirement for browser ImageData.
- Completed the chroma quantization table, clamped encoder quantizers, and corrected quality changes through re-quantization.
- Preserved component-specific quantization tables when saving, including nonstandard table IDs and separate Cb/Cr tables.
- Fixed restart boundaries in progressive Huffman scans; added independently generated baseline/progressive restart fixtures.
- Corrected rotation of quantization tables and horizontal 4:2:2 block ordering.
- Preserved complete images through re-encoding when coefficient transforms cannot represent the requested result; added a losslessOnly option and flat-buffer transform support.

## 1.0.0 - 2026-05-17

- Fixed progressive JPEG decoding correctness issues
- Removed jpeg-js runtime fallback path from library decode flow
- Added robust non-interleaved component raster handling for progressive scans
- Improved progressive decoder performance with hot-path optimizations
- Added package metadata and release docs for publishing
