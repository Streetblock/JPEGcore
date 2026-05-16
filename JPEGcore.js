/**
* JpegCORE - A pure JavaScript JPEG Encoder/Decoder/Transformer Library
* Extended Version 1.8.3 JIT Turbo
* * CORES:
* - Decoder: Added Loeffler Integer IDCT (Standard), Naive IDCT (Legacy/Reference),
* Fixed IDCT amplitude/saturation bug (v1.7.5), Robust Mode(v1.7.8)
* - Encoder: ZigZag order fix for saving (v1.7.4), enfoceNewQuality (1.7.7)
* * * Features  1.7.6:
* - NEW: Quantization Crush (Deep Fry effect)
* - NEW: Chromatic Aberration (Channel shifting)
* - Standard: Encode, Decode (Scale-on-Load), Transform, Analysis
*/

const JpegCORE = {
    // --- 1. CONSTANTS ---
    Constants: {
      MARKERS: {
          SOI: 0xD8, EOI: 0xD9, SOF0: 0xC0, SOF2: 0xC2, DHT: 0xC4,
          DQT: 0xDB, SOS: 0xDA, APP0: 0xE0, APP1: 0xE1, COM: 0xFE, RST0: 0xD0, RST7: 0xD7
      },
      ZIG_ZAG: new Int32Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]),

      ZIG_ZAG_ARR: [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63],
      QUANT_L: [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99],
      QUANT_C: [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99],
      HUFFMAN: {
            DC_L_NR: [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
            DC_L_VAL: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            AC_L_NR: [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d],
            AC_L_VAL: [0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa],
            DC_C_NR: [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            DC_C_VAL: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            AC_C_NR: [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77],
            AC_C_VAL: [0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa]
        },
        SAMPLE_MODES: {
            'GRAY': { hMax: 1, vMax: 1, blocks: [{ t: 'Y', dx: 0, dy: 0 }] },
            '444': { hMax: 1, vMax: 1, blocks: [{ t: 'Y', dx: 0, dy: 0 }, { t: 'C', dx: 0, dy: 0, c: 0 }, { t: 'C', dx: 0, dy: 0, c: 1 }] },
            '422': { hMax: 2, vMax: 1, blocks: [{ t: 'Y', dx: 0, dy: 0 }, { t: 'Y', dx: 1, dy: 0 }, { t: 'C', dx: 0, dy: 0, c: 0 }, { t: 'C', dx: 0, dy: 0, c: 1 }] },
            '420': { hMax: 2, vMax: 2, blocks: [{ t: 'Y', dx: 0, dy: 0 }, { t: 'Y', dx: 1, dy: 0 }, { t: 'Y', dx: 0, dy: 1 }, { t: 'Y', dx: 1, dy: 1 }, { t: 'C', dx: 0, dy: 0, c: 0 }, { t: 'C', dx: 0, dy: 0, c: 1 }] }
        }
    },

    // --- 2. ANALYSIS ---
    Analysis: {
        _readExifOrientation: function(seg) {
            if (seg.length < 14) return null;
            if (String.fromCharCode(...seg.slice(4, 10)) !== "Exif\0\0") return null;

            const tiffStart = 10;
            const isLE = (seg[tiffStart] === 0x49 && seg[tiffStart + 1] === 0x49);

            const readU16 = (off) => {
                if (off + 2 > seg.length) return 0;
                if (isLE) return seg[off] | (seg[off + 1] << 8);
                return (seg[off] << 8) | seg[off + 1];
            };
            const readU32 = (off) => {
                if (off + 4 > seg.length) return 0;
                if (isLE) return (seg[off] | (seg[off + 1] << 8) | (seg[off + 2] << 16) | (seg[off + 3] << 24)) >>> 0;
                return ((seg[off] << 24) | (seg[off + 1] << 16) | (seg[off + 2] << 8) | seg[off + 3]) >>> 0;
            };

            if (readU16(tiffStart + 2) !== 42) return null;

            const ifdOffset = readU32(tiffStart + 4);
            let p = tiffStart + ifdOffset;

            if (p >= seg.length) return null;

            const numEntries = readU16(p);
            p += 2;

            for (let i = 0; i < numEntries; i++) {
                if (p + 12 > seg.length) break;
                const tag = readU16(p);
                if (tag === 0x0112) {
                    return readU16(p + 8);
                }
                p += 12;
            }
            return null;
        },

        parseStructure: function(d) {
            const M = JpegCORE.Constants.MARKERS;
            if (d[0] !== 0xFF || d[1] !== M.SOI) throw new Error("Not a valid JPEG");
            let pos = 2, w = 0, h = 0, mcuStructure = null, mcuW = 0, mcuH = 0, rawDataOffset = 0;
            const extractedDecHuff = {};
            const SM = JpegCORE.Constants.SAMPLE_MODES;

            while (pos < d.length - 1) {
                if (d[pos] !== 0xFF) { pos++; continue; }
                while (d[pos] === 0xFF && pos < d.length) pos++;
                const marker = d[pos];
                if (marker === M.SOS) {
                    const len = (d[pos + 1] << 8) | d[pos + 2];
                    rawDataOffset = pos + 1 + len;
                    break;
                }
                const len = (d[pos + 1] << 8) | d[pos + 2];
                const segmentEnd = pos + 1 + len;

                if (marker === M.SOF0 || marker === M.SOF2) {
                    h = (d[pos + 4] << 8) | d[pos + 5];
                    w = (d[pos + 6] << 8) | d[pos + 7];
                    const numComps = d[pos + 8];
                    let compMapList = [];
                    for (let i = 0; i < numComps; i++) compMapList.push({ samp: d[pos + 10 + (i * 3)] });
                    if (numComps === 1) mcuStructure = SM['GRAY'];
                    else {
                        const ySamp = compMapList[0].samp;
                        mcuStructure = (ySamp === 0x22 ? SM['420'] : (ySamp === 0x21 ? SM['422'] : (ySamp === 0x11 ? SM['444'] : SM['420'])));
                    }
                    if (mcuStructure) { mcuW = mcuStructure.hMax * 8; mcuH = mcuStructure.vMax * 8; }
                } else if (marker === M.DHT) {
                    let subPos = pos + 3;
                    while (subPos < segmentEnd) {
                        const info = d[subPos++];
                        const tc = (info >> 4) & 0x0F, th = info & 0x0F;
                        const nr = Array.from(d.slice(subPos, subPos + 16)); subPos += 16;
                        let count = 0; for (let c of nr) count += c;
                        const val = Array.from(d.slice(subPos, subPos + count)); subPos += count;
                        if (th === 0 && tc === 0) extractedDecHuff.l_dc = { n: nr, v: val };
                        if (th === 0 && tc === 1) extractedDecHuff.l_ac = { n: nr, v: val };
                        if (th === 1 && tc === 0) extractedDecHuff.c_dc = { n: nr, v: val };
                        if (th === 1 && tc === 1) extractedDecHuff.c_ac = { n: nr, v: val };
                    }
                }
                pos = segmentEnd;
            }
            if (!w || !h || !mcuStructure) throw new Error("Structure Parse Failed");

            const H = JpegCORE.Constants.HUFFMAN;
            const finalHuff = {
                l_dc: extractedDecHuff.l_dc || { n: H.DC_L_NR, v: H.DC_L_VAL },
                l_ac: extractedDecHuff.l_ac || { n: H.AC_L_NR, v: H.AC_L_VAL },
                c_dc: extractedDecHuff.c_dc || extractedDecHuff.l_dc || { n: H.DC_C_NR, v: H.DC_C_VAL },
                c_ac: extractedDecHuff.c_ac || extractedDecHuff.l_ac || { n: H.AC_C_NR, v: H.AC_C_VAL }
            };
            const mh = (L, V) => { let t = {}, c = 0, p = 0; for (let i = 1; i <= 16; i++) { for (let j = 0; j < L[i - 1]; j++) { let k = ""; for (let x = i - 1; x >= 0; x--)k += (c >> x) & 1; t[k] = V[p++]; c++; } c <<= 1; } return t; };
            return { w, h, mcuStructure, mcuW, mcuH, rawDataOffset, tLD: mh(finalHuff.l_dc.n, finalHuff.l_dc.v), tLA: mh(finalHuff.l_ac.n, finalHuff.l_ac.v), tCD: mh(finalHuff.c_dc.n, finalHuff.c_dc.v), tCA: mh(finalHuff.c_ac.n, finalHuff.c_ac.v) };
        },

        probe: async function(file) {
            try {
                const buf = await file.arrayBuffer();
                const d = new Uint8Array(buf);
                const M = JpegCORE.Constants.MARKERS;
                const ZZ = JpegCORE.Constants.ZIG_ZAG_ARR;
                let pos = 0, qtL = null, qtC = null;
                const meta = [];
                let infoStr = "", detectedSamp = '420';
                let detectedOrientation = null;
                const rawHuff = { 0: {}, 1: {} };

                while (pos < d.length - 1) {
                    if (d[pos] === 0xFF) {
                        const type = d[pos + 1];
                        if (type === M.SOS || type === M.EOI) break;
                        if (type === M.SOI) { pos += 2; continue; }
                        if (type >= M.SOF0 && type <= M.COM) {
                            const len = (d[pos + 2] << 8) | d[pos + 3];
                            const fullSegment = d.slice(pos, pos + 2 + len);
                            if (type === M.SOF0) {
                                const ySamp = d[pos + 11];
                                if (ySamp === 0x22) detectedSamp = '420'; else if (ySamp === 0x21) detectedSamp = '422'; else if (ySamp === 0x11) detectedSamp = '444';
                                infoStr += `[Fmt:${detectedSamp}] `;
                            } else if (type === M.DQT) {
                                let subPos = pos + 4, end = pos + 2 + len;
                                while (subPos < end) {
                                    const info = d[subPos++];
                                    const id = info & 0x0F, precision = (info >> 4) & 0x0F;
                                    if (precision === 0) {
                                        const rawZZ = d.slice(subPos, subPos + 64);
                                        const natural = new Uint8Array(64);
                                        for (let i = 0; i < 64; i++) natural[ZZ[i]] = rawZZ[i];
                                        if (id === 0) qtL = natural; if (id === 1) qtC = natural;
                                        subPos += 64;
                                    } else { subPos += 64 * 2; }
                                }
                            } else if (type === M.DHT) {
                                let subPos = pos + 4, end = pos + 2 + len;
                                while (subPos < end) {
                                    const info = d[subPos++], tc = (info >> 4) & 0x0F, th = info & 0x0F;
                                    const nr = Array.from(d.slice(subPos, subPos + 16)); subPos += 16;
                                    let count = 0; for (let c of nr) count += c;
                                    const val = Array.from(d.slice(subPos, subPos + count)); subPos += count;
                                    if (rawHuff[tc]) rawHuff[tc][th] = { n: nr, v: val };
                                }
                            } else if ((type >= M.APP0 && type <= 0xEF) || type === M.COM) {
                                meta.push(fullSegment);
                                const label = (type === M.COM) ? "COM" : "APP" + (type - 0xE0);
                                infoStr += `[${label}] `;
                                if (type === M.APP1) {
                                    const ori = JpegCORE.Analysis._readExifOrientation(fullSegment);
                                    if (ori) {
                                        detectedOrientation = ori;
                                        infoStr += `[Ori:${ori}] `;
                                    }
                                }
                            }
                            pos += 2 + len;
                            continue;
                        }
                    }
                    pos++;
                }
                const extractedHuff = {};
                let foundCustom = false;
                if (rawHuff[0][0]) { extractedHuff.l_dc = rawHuff[0][0]; foundCustom = true; }
                if (rawHuff[1][0]) { extractedHuff.l_ac = rawHuff[1][0]; foundCustom = true; }
                if (rawHuff[0][1]) { extractedHuff.c_dc = rawHuff[0][1]; foundCustom = true; } else if (rawHuff[0][0]) extractedHuff.c_dc = rawHuff[0][0];
                if (rawHuff[1][1]) { extractedHuff.c_ac = rawHuff[1][1]; foundCustom = true; } else if (rawHuff[1][0]) extractedHuff.c_ac = rawHuff[1][0];

                if (foundCustom) infoStr += "[Huffman:Custom] "; else infoStr += "[Huffman:Std] ";

                return {
                    detectedMode: detectedSamp,
                    detectedHuffman: foundCustom ? extractedHuff : null,
                    detectedMetaSegments: meta,
                    detectedOrientation: detectedOrientation,
                    customQtL: qtL,
                    customQtC: qtC
                };
            } catch (e) { console.error(e); return null; }
        }
    },

    // Decoder Logic: v1.8.0 (Reliable Progressive/Baseline)
    // Memory/IDCT: v1.8.1 (Zero-Alloc, Fast)
    // Huffman Fix: v1.8.2 (Tree-based, no strings)
    // JIT Fix: v1.8.3 (Int-based Status Codes)

    /**
     * JpegCORE v1.8.3 - JIT TURBO
     * * Performance Update:
     * 1. Huffman Decoding: Removed String Returns ('MARKER', 'RST').
     * Uses Integers (-1, -2) for monomorphic return types.
     * 2. Renderer: Optimized inner loop pointer arithmetic (removed multiplication).
     */

     Decoder: {
        // --- 1. OPTIMIZED IDCT (Integer - Fast & Correct) ---
        IDCT: class {
            constructor() {
                this.p = new Int32Array(64);
                this.defaultOut = new Uint8ClampedArray(64);
            }

            transform(inBuffer, inOffset, quantTable, outSize = 8, outBuffer = null, outOffset = 0) {
                const target = outBuffer || this.defaultOut;
                const qt = quantTable;

                // DC-Only optimization
                if (outSize === 1) {
                   const val = (inBuffer[inOffset] * qt[0] + 1024) >> 11;
                   target[outOffset] = val + 128;
                   return target;
                }

                this._transformLoefflerInt(inBuffer, inOffset, qt, target, outOffset);
                return target;
            }

            _transformLoefflerInt(inBuffer, inOffset, qt, outBuffer, outOffset) {
                const p = this.p;
                let v0, v1, v2, v3, v4, v5, v6, v7, t;

                for (let i = 0; i < 8; ++i) {
                    const row = 8 * i, blkRow = inOffset + row;
                    // Zero AC check
                    if ((inBuffer[blkRow+1] | inBuffer[blkRow+2] | inBuffer[blkRow+3] |
                         inBuffer[blkRow+4] | inBuffer[blkRow+5] | inBuffer[blkRow+6] | inBuffer[blkRow+7]) === 0) {
                        t = (5793 * (inBuffer[blkRow] * qt[row]) + 512) >> 10;
                        p[row]=t; p[row+1]=t; p[row+2]=t; p[row+3]=t; p[row+4]=t; p[row+5]=t; p[row+6]=t; p[row+7]=t;
                        continue;
                    }
                    v0 = (5793 * (inBuffer[blkRow+0] * qt[row+0]) + 128) >> 8;
                    v1 = (5793 * (inBuffer[blkRow+4] * qt[row+4]) + 128) >> 8;
                    v2 = inBuffer[blkRow+2] * qt[row+2]; v3 = inBuffer[blkRow+6] * qt[row+6];
                    v4 = (2896 * ((inBuffer[blkRow+1] * qt[row+1]) - (inBuffer[blkRow+7] * qt[row+7])) + 128) >> 8;
                    v7 = (2896 * ((inBuffer[blkRow+1] * qt[row+1]) + (inBuffer[blkRow+7] * qt[row+7])) + 128) >> 8;
                    v5 = (inBuffer[blkRow+3] * qt[row+3]) << 4; v6 = (inBuffer[blkRow+5] * qt[row+5]) << 4;
                    t = (v0 - v1+ 1) >> 1; v0 = (v0 + v1 + 1) >> 1; v1 = t;
                    t = (v2 * 3784 + v3 * 1567 + 128) >> 8; v2 = (v2 * 1567 - v3 * 3784 + 128) >> 8; v3 = t;
                    t = (v4 - v6 + 1) >> 1; v4 = (v4 + v6 + 1) >> 1; v6 = t;
                    t = (v7 + v5 + 1) >> 1; v5 = (v7 - v5 + 1) >> 1; v7 = t;
                    t = (v0 - v3 + 1) >> 1; v0 = (v0 + v3 + 1) >> 1; v3 = t;
                    t = (v1 - v2 + 1) >> 1; v1 = (v1 + v2 + 1) >> 1; v2 = t;
                    t = (v4 * 2276 + v7 * 3406 + 2048) >> 12; v4 = (v4 * 3406 - v7 * 2276 + 2048) >> 12; v7 = t;
                    t = (v5 * 799 + v6 * 4017 + 2048) >> 12; v5 = (v5 * 4017 - v6 * 799 + 2048) >> 12; v6 = t;
                    p[row+0] = v0 + v7; p[row+7] = v0 - v7; p[row+1] = v1 + v6; p[row+6] = v1 - v6;
                    p[row+2] = v2 + v5; p[row+5] = v2 - v5; p[row+3] = v3 + v4; p[row+4] = v3 - v4;
                }

                for (let i = 0; i < 8; ++i) {
                    const col = i;
                    if ((p[8+col] | p[16+col] | p[24+col] | p[32+col] | p[40+col] | p[48+col] | p[56+col]) === 0) {
                        t = (5793 * p[col] + 8192) >> 14;
                        t = 128 + ((t + 8) >> 4);
                        if(t<0) t=0; else if(t>255) t=255;
                        outBuffer[outOffset+col] = t; outBuffer[outOffset+8+col] = t;
                        outBuffer[outOffset+16+col] = t; outBuffer[outOffset+24+col] = t;
                        outBuffer[outOffset+32+col] = t; outBuffer[outOffset+40+col] = t;
                        outBuffer[outOffset+48+col] = t; outBuffer[outOffset+56+col] = t;
                        continue;
                    }
                    v0 = (5793 * p[col] + 2048) >> 12; v1 = (5793 * p[32+col] + 2048) >> 12; v2 = p[16+col]; v3 = p[48+col];
                    v4 = (2896 * (p[8+col] - p[56+col]) + 2048) >> 12; v7 = (2896 * (p[8+col] + p[56+col]) + 2048) >> 12; v5 = p[24+col]; v6 = p[40+col];
                    t = (v0 - v1 + 1) >> 1; v0 = (v0 + v1 + 1) >> 1; v1 = t;
                    t = (v2 * 3784 + v3 * 1567 + 2048) >> 12; v2 = (v2 * 1567 - v3 * 3784 + 2048) >> 12; v3 = t;
                    t = (v4 - v6 + 1) >> 1; v4 = (v4 + v6 + 1) >> 1; v6 = t;
                    t = (v7 + v5 + 1) >> 1; v5 = (v7 - v5 + 1) >> 1; v7 = t;
                    t = (v0 - v3 + 1) >> 1; v0 = (v0 + v3 + 1) >> 1; v3 = t;
                    t = (v1 - v2 + 1) >> 1; v1 = (v1 + v2 + 1) >> 1; v2 = t;
                    t = (v4 * 2276 + v7 * 3406 + 2048) >> 12; v4 = (v4 * 3406 - v7 * 2276 + 2048) >> 12; v7 = t;
                    t = (v5 * 799 + v6 * 4017 + 2048) >> 12; v5 = (v5 * 4017 - v6 * 799 + 2048) >> 12; v6 = t;

                    const o = outOffset + col;
                    let val;
                    val = 128 + ((v0 + v7 + 8) >> 4); outBuffer[o] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v1 + v6 + 8) >> 4); outBuffer[o+8] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v2 + v5 + 8) >> 4); outBuffer[o+16] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v3 + v4 + 8) >> 4); outBuffer[o+24] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v3 - v4 + 8) >> 4); outBuffer[o+32] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v2 - v5 + 8) >> 4); outBuffer[o+40] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v1 - v6 + 8) >> 4); outBuffer[o+48] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v0 - v7 + 8) >> 4); outBuffer[o+56] = val < 0 ? 0 : (val > 255 ? 255 : val);
                }
            }
        },

        // --- 2. HYBRID DECODER (Final Fix: RST + Progressive EOB Refinement) ---
        extractBlocksStruct: async function(file) {
            try {
                const buf = await file.arrayBuffer();
                const d = new Uint8Array(buf);
                const M = JpegCORE.Constants.MARKERS, ZZ = JpegCORE.Constants.ZIG_ZAG, SM = JpegCORE.Constants.SAMPLE_MODES;
                const H = JpegCORE.Constants.HUFFMAN;

                // STATUS CODES
                const STAT_MARKER = -1;
                const STAT_RST = -2;

                // --- Robust Bit Reader ---
                let bp = 0, bb = 0, bc = 0;
                const nb = () => {
                    if (bc === 0) {
                        if (bp >= d.length) return null;
                        let b = d[bp++];
                        if (b === 0xFF) {
                            if (bp >= d.length) return null;
                            let next = d[bp];
                            if (next === 0) { bp++; }
                            else if (next >= 0xD0 && next <= 0xD7) { bp++; return STAT_RST; }
                            else if (next === M.EOI) { return null; }
                            else { return STAT_MARKER; }
                        }
                        bb = b; bc = 8;
                    }
                    const bit = (bb >> (bc - 1)) & 1;
                    bc--;
                    return bit;
                };

                const readRawBits = (l) => {
                    let v = 0;
                    for (let i = 0; i < l; i++) {
                        const b = nb();
                        if (b === STAT_MARKER || b === STAT_RST || b === null) return null;
                        v = (v << 1) | b;
                    }
                    return v;
                };

                const rh = (node) => {
                    let curr = node;
                    let safety = 0;
                    while (safety++ < 32) {
                        const b = nb();
                        if (b === STAT_MARKER || b === STAT_RST || b === null) return b;
                        curr = curr[b];
                        if (typeof curr === 'number') return curr;
                        if (curr === undefined) return null;
                    }
                    return null;
                };

                const rv = (l) => {
                    let v = 0;
                    for (let i = 0; i < l; i++) {
                        const b = nb();
                        if (b === STAT_MARKER || b === STAT_RST || b === null) return null;
                        v = (v << 1) | b;
                    }
                    return v < (1 << (l - 1)) ? v + (-1 << l) + 1 : v;
                };

                const mh = (L, V) => {
                    const root = [];
                    let c = 0, p = 0;
                    for (let i = 1; i <= 16; i++) {
                        for (let j = 0; j < L[i - 1]; j++) {
                            let curr = root;
                            for (let x = i - 1; x >= 0; x--) {
                                const bit = (c >> x) & 1;
                                if (x === 0) {
                                    if(p < V.length) curr[bit] = V[p++];
                                } else {
                                    if (curr[bit] === undefined) curr[bit] = [];
                                    curr = curr[bit];
                                }
                            }
                            c++;
                        }
                        c <<= 1;
                    }
                    return root;
                };

                // --- Parser Header ---
                if (d.length < 2) throw new Error("File too short");
                let pos = 0, w = 0, h = 0, mcuStructure = null, finalMode = '420', compMapList = [];
                let tables = { 0: { 0: mh(H.DC_L_NR, H.DC_L_VAL), 1: mh(H.DC_C_NR, H.DC_C_VAL) }, 1: { 0: mh(H.AC_L_NR, H.AC_L_VAL), 1: mh(H.AC_C_NR, H.AC_C_VAL) } };
                const quantTables = {};

                if (d[0] === 0xFF && d[1] === M.SOI) pos = 2;

                while (pos < d.length - 1) {
                    if (d[pos] !== 0xFF) { pos++; continue; }
                    while (d[pos] === 0xFF && pos < d.length) pos++;
                    if (pos >= d.length) break;
                    const marker = d[pos];

                    if (marker === M.SOS) break;

                    if (pos + 2 >= d.length) break;
                    const len = (d[pos + 1] << 8) | d[pos + 2];
                    const segmentEnd = pos + 1 + len;
                    if (segmentEnd > d.length) break;

                    if (marker === M.SOF0 || marker === M.SOF2) {
                        h = (d[pos + 4] << 8) | d[pos + 5];
                        w = (d[pos + 6] << 8) | d[pos + 7];
                        const numComps = d[pos + 8];
                        compMapList = [];
                        for (let i = 0; i < numComps; i++) {
                            compMapList.push({
                                id: d[pos + 9 + (i * 3)],
                                type: (i === 0) ? 0 : (i === 1 ? 1 : 2),
                                samp: d[pos + 10 + (i * 3)],
                                tq: d[pos + 11 + (i * 3)]
                            });
                        }
                        if (numComps === 1) {
                            finalMode = 'GRAY'; mcuStructure = SM['GRAY'];
                        } else {
                            const ySamp = compMapList[0].samp;
                            if (ySamp === 0x22) finalMode = '420';
                            else if (ySamp === 0x21) finalMode = '422';
                            else finalMode = '444';
                            mcuStructure = SM[finalMode];
                        }
                    } else if (marker === M.DHT) {
                        let subPos = pos + 3;
                        while (subPos < segmentEnd) {
                            const info = d[subPos++];
                            const tc = (info >> 4) & 0x0F, th = info & 0x0F;
                            const nr = Array.from(d.slice(subPos, subPos + 16)); subPos += 16;
                            let count = 0; for (let c of nr) count += c;
                            const val = Array.from(d.slice(subPos, subPos + count)); subPos += count;
                            if (!tables[tc]) tables[tc] = {};
                            tables[tc][th] = mh(nr, val);
                        }
                    } else if (marker === M.DQT) {
                        let subPos = pos + 3;
                        while (subPos < segmentEnd) {
                            const info = d[subPos++];
                            const id = info & 0x0F;
                            const naturalTbl = new Uint8Array(64);
                            for (let z = 0; z < 64; z++) naturalTbl[ZZ[z]] = d[subPos++] || 10;
                            quantTables[id] = naturalTbl;
                        }
                    }
                    pos = segmentEnd;
                }

                if (!w || !h || !mcuStructure) return { blocks: [], w: 0, h: 0, mode: '420', quantTables: {}, compMap: [] };

                // --- Setup Buffer ---
                const blocksPerMCU = mcuStructure.blocks.length;
                const cols = Math.ceil(w / (mcuStructure.hMax * 8));
                const rows = Math.ceil(h / (mcuStructure.vMax * 8));
                const totalBlocks = cols * rows * blocksPerMCU;
                const coeffBuffer = new Int32Array(totalBlocks * 64);

                const blockList = new Array(totalBlocks);
                for(let m = 0; m < cols * rows; m++) {
                    for(let b = 0; b < blocksPerMCU; b++) {
                        const idx = m * blocksPerMCU + b;
                        const def = mcuStructure.blocks[b];
                        blockList[idx] = { type: def.t, comp: (def.t === 'C') ? (def.c === 0 ? 1 : 2) : 0 };
                    }
                }

                bp = pos; bb = 0; bc = 0;
                if (pos < d.length && d[pos] !== 0xFF && d[pos-1] === 0xFF) pos--;
                let predDC = [0, 0, 0];

                // --- Scan Loop ---
                try {
                    while (pos < d.length - 1) {
                        if (d[pos] !== 0xFF) { pos++; continue; }
                        while(d[pos] === 0xFF && pos < d.length) pos++;
                        if (pos >= d.length) break;
                        const marker = d[pos];

                        if (marker === M.SOS) {
                            const len = (d[pos + 1] << 8) | d[pos + 2];
                            const sosEnd = pos + 1 + len;
                            if (sosEnd > d.length) break;

                            const ns = d[pos + 3];
                            const comps = [];
                            for (let i = 0; i < ns; i++) {
                                const cs = d[pos + 4 + i * 2];
                                const tdta = d[pos + 5 + i * 2];
                                const mapObj = compMapList.find(x => x.id === cs);
                                if (mapObj) comps.push({ type: mapObj.type, dcTbl: (tdta >> 4) & 0xF, acTbl: tdta & 0xF });
                            }
                            if (comps.length === 0) comps.push({type:0, dcTbl:0, acTbl:0});

                            const Ss = d[sosEnd - 3], Se = d[sosEnd - 2], AhAl = d[sosEnd - 1];
                            const Ah = (AhAl >> 4) & 0xF, Al = AhAl & 0xF;

                            bp = sosEnd; bb = 0; bc = 0;
                            let eob_run = 0;
                            let successiveACState = 0;
                            let successiveACNextValue = 0;
                            let acRun = 0;

                            if (Ss === 0) predDC = [0,0,0];

                            const typeToIndices = {};
                            for (let b = 0; b < blocksPerMCU; b++) {
                                const def = mcuStructure.blocks[b], t = (def.t === 'C') ? (def.c === 0 ? 1 : 2) : 0;
                                if (!typeToIndices[t]) typeToIndices[t] = [];
                                typeToIndices[t].push(b);
                            }

                            let markerFound = false;

                            for (let m = 0; m < cols * rows; m++) {
                                for (let c of comps) {
                                    const blkIndices = typeToIndices[c.type];
                                    if (!blkIndices) continue;

                                    for (let bIdx of blkIndices) {
                                        if (successiveACState === 0 && eob_run === 0) acRun = 0;

                                        const blockOffset = (m * blocksPerMCU + bIdx) * 64;
                                        if (blockOffset + 64 > coeffBuffer.length) { markerFound = true; break; }

                                        // --- DC SCAN ---
                                        if (Ss === 0) {
                                            const tbl = (tables[0][c.dcTbl]) ? tables[0][c.dcTbl] : tables[0][0];
                                            if (!tbl) { markerFound = true; break; }

                                            if (Ah === 0) {
                                                let s = rh(tbl);
                                                // FIX: RST Handling Complete Reset
                                                if (s === STAT_RST) {
                                                    predDC = [0, 0, 0];
                                                    bc = 0; eob_run = 0; successiveACState = 0;
                                                    s = rh(tbl);
                                                }
                                                if (s === STAT_MARKER || s === null) { markerFound = true; break; }

                                                let diff = 0; if (s !== 0) diff = rv(s);
                                                if (diff === null) { markerFound = true; break; }
                                                predDC[c.type] += diff;
                                                coeffBuffer[blockOffset] = predDC[c.type] << Al;
                                            } else {
                                                let bit = nb();
                                                if (bit === STAT_MARKER || bit === null) { markerFound = true; break; }
                                                if (bit === 1) {
                                                    if (coeffBuffer[blockOffset] >= 0) coeffBuffer[blockOffset] += (1 << Al);
                                                    else coeffBuffer[blockOffset] -= (1 << Al);
                                                }
                                            }
                                        }

                                        // --- AC SCAN ---
                                        if (Se > 0) {
                                            const tbl = (tables[1][c.acTbl]) ? tables[1][c.acTbl] : tables[1][0];
                                            if (!tbl) { markerFound = true; break; }

                                            if (Ah === 0) {
                                                // --- AC FIRST SCAN ---
                                                if (eob_run > 0) {
                                                    eob_run--;
                                                } else {
                                                    let k = Math.max(Ss, 1);
                                                    while (k <= Se) {
                                                        let s = rh(tbl);
                                                        // FIX: RST Handling
                                                        if (s === STAT_RST) {
                                                            predDC = [0, 0, 0];
                                                            bc=0; eob_run=0;
                                                            s = rh(tbl);
                                                        }
                                                        if (s === STAT_MARKER || s === null) { markerFound = true; break; }

                                                        const r = s >> 4, v = s & 15;
                                                        if (v === 0) {
                                                            if (r < 15) {
                                                                const extra = readRawBits(r);
                                                                if (extra === null) { eob_run=0; markerFound=true; break; }
                                                                eob_run = (1 << r) + extra;
                                                                eob_run--; break;
                                                            } else { k += 15; }
                                                        } else {
                                                            k += r;
                                                            const val = rv(v);
                                                            if (val === null) { markerFound = true; break; }
                                                            if (k <= Se) coeffBuffer[blockOffset + ZZ[k]] = val << Al;
                                                        }
                                                        k++;
                                                    }
                                                }
                                              } else {
                                                  // --- AC SUCCESSIVE (Ah > 0) ROBUST FIX ---
                                                  // Strategie: "Seek & Refine Loop"
                                                  // Anstatt einen Status zu speichern, führen wir Runs sofort aus,
                                                  // indem wir k vorwärts bewegen und dabei alles verfeinern, was im Weg liegt.

                                                  let k = Math.max(Ss, 1);
                                                  const p1 = 1 << Al;
                                                  const m1 = (-1) << Al;

                                                  while (k <= Se) {
                                                      const idx = blockOffset + ZZ[k];

                                                      // 1. Ist hier schon ein Wert? -> Immer verfeinern!
                                                      if (coeffBuffer[idx] !== 0) {
                                                          let bit = nb();
                                                          if (bit === STAT_MARKER || bit === null) { markerFound = true; break; }
                                                          if (bit === 1) {
                                                              if (coeffBuffer[idx] > 0) coeffBuffer[idx] += p1;
                                                              else coeffBuffer[idx] += m1;
                                                          }
                                                          k++;
                                                          continue; // Weiter zum nächsten Koeffizienten
                                                      }

                                                      // 2. Hier ist eine Null. Was tun?

                                                      // Fall A: Wir sind noch in einem EOB-Run von vorherigen Blöcken (oder diesem).
                                                      // Wir dürfen KEINEN Huffman Code lesen, müssen aber k weiterlaufen lassen,
                                                      // falls später im Block noch Non-Zeros kommen (unwahrscheinlich bei EOB, aber möglich per Spec).
                                                      if (eob_run > 0) {
                                                          k++;
                                                          continue;
                                                      }

                                                      // Fall B: Wir müssen einen neuen Befehl lesen
                                                      let rs = rh(tbl);

                                                      // RST Handling
                                                      if (rs === STAT_RST) {
                                                          predDC = [0, 0, 0];
                                                          bc = 0; eob_run = 0;
                                                          rs = rh(tbl); // Retry
                                                      }
                                                      if (rs === STAT_MARKER || rs === null) { markerFound = true; break; }

                                                      const s = rs & 15;
                                                      const r = rs >> 4;

                                                      // --- BEFEHL AUSFÜHREN ---

                                                      let zerosToSkip = r;

                                                      if (s === 0) {
                                                          if (r < 15) {
                                                              // --- EOB (End of Band) ---
                                                              const extra = readRawBits(r);
                                                              if (extra === null) { markerFound = true; break; }
                                                              eob_run = (1 << r) + extra;
                                                              eob_run--; // Dieser Block zählt dazu

                                                              // Rest des Blocks überspringen (aber Refinement fortsetzen!)
                                                              k++; // Aktuelle Null überspringen
                                                              continue;
                                                          } else {
                                                              // --- ZRL (Zero Run Length) ---
                                                              // Überspringe 15 Nullen. Die aktuelle ist die 16te (oder andersrum).
                                                              // Spec sagt: ZRL = 16 Nullen.
                                                              zerosToSkip = 15; // Wir stehen schon auf einer Null, also noch 15 weitere suchen
                                                          }
                                                      } else {
                                                          // --- VALUE (Run r, dann Value) ---
                                                          if (s !== 1) console.warn("Invalid AC code");
                                                          // Den Wert lesen wir schon jetzt, schreiben ihn aber erst nach dem Skip
                                                          let bit = nb();
                                                          if (bit === STAT_MARKER || bit === null) { markerFound = true; break; }

                                                          const v = (bit === 1) ? 1 : -1;
                                                          const newVal = v << Al; // Bitshift für Successive Approx

                                                          // LOGIK: Überspringe 'zerosToSkip' Nullen.
                                                          // Schreibe 'newVal' in die *nächste* freie Null danach.

                                                          // Schleife zum Überspringen der Nullen
                                                          while (zerosToSkip > 0) {
                                                              k++; // Gehe zum nächsten
                                                              if (k > Se) break; // Block zu Ende (sollte nicht passieren bei validem JPEG)

                                                              const skipIdx = blockOffset + ZZ[k];
                                                              if (coeffBuffer[skipIdx] !== 0) {
                                                                  // WICHTIG: Während wir Nullen suchen, müssen wir über Non-Zeros springen
                                                                  // UND diese verfeinern!
                                                                  let b2 = nb();
                                                                  if (b2 === STAT_MARKER || b2 === null) { markerFound = true; break; }
                                                                  if (b2 === 1) {
                                                                       if (coeffBuffer[skipIdx] > 0) coeffBuffer[skipIdx] += p1;
                                                                       else coeffBuffer[skipIdx] += m1;
                                                                  }
                                                              } else {
                                                                  // Wir haben eine Null gefunden!
                                                                  zerosToSkip--;
                                                              }
                                                          }
                                                          if (markerFound) break;

                                                          // Jetzt stehen wir auf (oder vor) der Null, die den Wert bekommen soll?
                                                          // Nein, die while-Schleife oben hat 'zerosToSkip' Nullen konsumiert.
                                                          // Der Wert kommt in die *nächste* Null.
                                                          // Aber Achtung: Wir müssen k noch einmal erhöhen, um auf die Ziel-Null zu kommen,
                                                          // falls wir nicht gerade ZRL gemacht haben.

                                                          // Such-Schleife für die Ziel-Position (die Null, die den Wert kriegt)
                                                          // Wir müssen solange weiterlaufen, bis wir eine Null finden (und Non-Zeros verfeinern)
                                                          while (k <= Se) {
                                                               // Wir müssen erst prüfen, ob wir am Ende sind, bevor wir schreiben
                                                               // Aber wir wollen ja auf die *nächste* Position.
                                                               // Also erst k checken.
                                                               // Im Fall r=0 (kein Skip) sind wir noch auf der aktuellen Null.
                                                               // Wenn wir r Zeros geskippt haben, sind wir auf der letzten geskippten Null.
                                                               // Wir müssen also für das Schreiben einen Schritt weiter, wenn wir geskippt haben.

                                                               // STOP: Das ist der kniffligste Teil.
                                                               // Vereinfachung:
                                                               // r=0: Current Zero kriegt den Wert.
                                                               // r=5: 5 Zeros bleiben 0. Die 6. Zero kriegt den Wert.

                                                               // Im 'else' (Value) Zweig oben haben wir 'zerosToSkip = r' gesetzt.
                                                               // Wenn r > 0 war, lief die Loop.
                                                               // Jetzt müssen wir den Wert schreiben.
                                                               // Wenn wir geskippt haben, stehen wir auf der r-ten Null.
                                                               // Wir müssen zur (r+1)-ten Null.

                                                               if (zerosToSkip === 0) { // Zeros sind aufgebraucht
                                                                    // Schreibe Wert hier hin?
                                                                    // Wenn r=0 war, wurde die Loop gar nicht betreten. Wir stehen auf der start Null.
                                                                    // Passt.
                                                                    // Wenn r=5 war, lief die Loop bis zerosToSkip=0. k zeigt auf die 5. Null.
                                                                    // Wir müssen also k erhöhen, bis wir die nächste Null finden.

                                                                    // Warte, ZRL (s=0) schreibt keinen Wert!
                                                                    // Also nur schreiben, wenn s=1.

                                                                    // Um das sauber zu lösen:
                                                                    // ZRL Logic oben: k so lassen.
                                                                    // Value Logic: Wir müssen den Wert schreiben.
                                                                    // Aber: Wenn wir geskippt haben (Loop lief), zeigt k auf die letzte Null des Skips.
                                                                    // Wir brauchen die nächste.
                                                               }
                                                               break; // Raus aus dem Logic Block, rein in die Write Loop unten
                                                          }

                                                          // Jetzt den Wert setzen (suche nächste Null)
                                                          // Wir müssen solange k++ machen, bis wir eine Null finden.
                                                          // Dabei Non-Zeros verfeinern.
                                                          // ABER: Wenn r=0 war, ist die *aktuelle* Position schon die Null.

                                                          // Kleiner Hack: Wir nutzen eine flag 'needsWrite'.
                                                          let targetFound = false;
                                                          while (k <= Se) {
                                                               const writeIdx = blockOffset + ZZ[k];
                                                               if (coeffBuffer[writeIdx] !== 0) {
                                                                    // Refine (wieder!)
                                                                    let b3 = nb();
                                                                    if (b3 === 1) {
                                                                         if (coeffBuffer[writeIdx] > 0) coeffBuffer[writeIdx] += p1;
                                                                         else coeffBuffer[writeIdx] += m1;
                                                                    }
                                                               } else {
                                                                    // Das ist die Ziel-Null!
                                                                    coeffBuffer[writeIdx] = newVal;
                                                                    targetFound = true;
                                                                    break; // Wert gesetzt, fertig mit diesem Befehl
                                                               }
                                                               k++;
                                                          }
                                                          if (!targetFound) break; // Sollte nicht passieren
                                                      }

                                                      // Nach jedem Befehl (ZRL, EOB, Value) müssen wir k erhöhen,
                                                      // damit wir beim nächsten Loop-Durchlauf nicht dieselbe Stelle bearbeiten.
                                                      k++;
                                                  }

                                                  // Cleanup EOB global
                                                  if (eob_run > 0) eob_run--;
                                              }
                                        }
                                        if (markerFound) break;
                                    }
                                    if (markerFound) break;
                                }
                                if (markerFound) break;
                            }
                            if (markerFound) pos = bp - 1; else pos = bp;

                        } else if (marker === M.DHT) {
                            const len = (d[pos + 1] << 8) | d[pos + 2];
                            if (pos + 1 + len > d.length) break;
                            let subPos = pos + 3, end = pos + 1 + len;
                            while (subPos < end) {
                                const info = d[subPos++];
                                const tc = (info >> 4) & 0x0F, th = info & 0x0F;
                                const nr = Array.from(d.slice(subPos, subPos + 16)); subPos += 16;
                                let count = 0; for (let c of nr) count += c;
                                const val = Array.from(d.slice(subPos, subPos + count)); subPos += count;
                                if (!tables[tc]) tables[tc] = {};
                                tables[tc][th] = mh(nr, val);
                            }
                            pos = end;
                        } else if (marker === M.EOI) { break; }
                        else { const len = (d[pos + 1] << 8) | d[pos + 2]; pos += 1 + len; }
                    }
                } catch (e) { console.warn("Robust Decode Warning:", e); }

                return { coeffBuffer, blockList, w, h, mode: finalMode, quantTables, compMap: compMapList };

            } catch (globalErr) {
                console.error("Critical Decoder Failure:", globalErr);
                return { blocks: [], w: 0, h: 0, mode: '420', quantTables: {}, compMap: [] };
            }
        },

        // Wrapper für Abwärtskompatibilität zu v1.8.0
        extractBlocks: async function(file) {
            // 1. Die neue, schnelle Funktion aufrufen
            const optimized = await this.extractBlocksStruct(file);

            // 2. Das "Flat Buffer" Array in einzelne Block-Objekte zerlegen (Legacy Format)
            const legacyBlocks = new Array(optimized.blockList.length);

            for (let i = 0; i < optimized.blockList.length; i++) {
                // Die 64 Koeffizienten für diesen Block ausschneiden
                const start = i * 64;
                const end = start + 64;
                // .slice() erzeugt eine Kopie, was genau dem Verhalten von 1.8.0 entspricht
                const blockData = optimized.coeffBuffer.slice(start, end);

                // Das Metadaten-Objekt holen
                const meta = optimized.blockList[i];

                // Beides im alten Format zusammenfügen
                legacyBlocks[i] = {
                    data: blockData,
                    type: meta.type,
                    comp: meta.comp
                };
            }

            // 3. Das alte Rückgabe-Objekt zurückgeben
            return {
                blocks: legacyBlocks,
                w: optimized.w,
                h: optimized.h,
                mode: optimized.mode,
                quantTables: optimized.quantTables,
                compMap: optimized.compMap
            };
        },

        // --- 3. OPTIMIZED RENDERER (Bit-Shifting + Robustness)  (Universal: 4:4:4, 4:2:2, 4:2:0) ---
        render: function(decoded, scale = 1.0) {
            if (!decoded) return new ImageData(1, 1);

            // 1. Daten prüfen
            const blockList = decoded.blockList || decoded.blocks;
            if (!blockList || blockList.length === 0) return new ImageData(1, 1);

            const w = Math.ceil(decoded.w * scale);
            const h = Math.ceil(decoded.h * scale);
            if (w === 0 || h === 0) return new ImageData(1, 1);

            // 2. Setup
            const blockSize = (scale === 0.5) ? 4 : (scale === 0.25 ? 2 : 8);
            // Fallback auf '420', falls kein Mode erkannt wurde
            const mode = decoded.mode || '420';
            const SM = JpegCORE.Constants.SAMPLE_MODES[mode] || JpegCORE.Constants.SAMPLE_MODES['420'];

            const isFlatBuffer = !!decoded.coeffBuffer;
            const buffer = decoded.coeffBuffer;
            const idct = new JpegCORE.Decoder.IDCT();

            // Puffer
            const mcuPix = new Uint8ClampedArray(64 * 10); // Genug Platz für max 10 Blöcke pro MCU
            const finalData = new Uint8ClampedArray(w * h * 4);

            // Quantisierungstabellen Mapping
            const compQT = {};
            if (decoded.compMap) {
                decoded.compMap.forEach(c => compQT[c.type] = decoded.quantTables[c.tq]);
            } else {
                const QL = new Uint8Array(JpegCORE.Constants.QUANT_L);
                const QC = new Uint8Array(JpegCORE.Constants.QUANT_C);
                compQT[0] = QL; compQT[1] = QC; compQT[2] = QC;
            }

            const mcuW = SM.hMax * blockSize;
            const mcuH = SM.vMax * blockSize;
            const cols = Math.ceil(w / mcuW);
            const rows = Math.ceil(h / mcuH);
            const blocksPerMCU = SM.blocks.length;

            let bIdx = 0;

            // --- 3. Main Loop ---
            for (let r = 0; r < rows; r++) {
                const rowBase = r * mcuH * w * 4;

                for (let c = 0; c < cols; c++) {
                    // A. IDCT für diesen MCU Block durchführen
                    for (let b = 0; b < blocksPerMCU; b++) {
                         if (bIdx >= blockList.length) break;
                         const meta = blockList[bIdx];
                         const qt = compQT[meta.comp] || compQT[0];

                         // Offset im mcuPix Buffer: BlockIndex * 64
                         if (isFlatBuffer) {
                             idct.transform(buffer, bIdx*64, qt, blockSize, mcuPix, b*64);
                         } else {
                             idct.transform(meta.data, 0, qt, blockSize, mcuPix, b*64);
                         }
                         bIdx++;
                    }

                    // B. Pixel Rendering (Farb-Konvertierung)
                    const ox = c * mcuW;
                    const oy = r * mcuH;
                    const maxY = Math.min(mcuH, h - oy);
                    const maxX = Math.min(mcuW, w - ox);

                    // Hier wird entschieden, wie wir die Pixel aus den Blöcken holen
                    // basierend auf dem Modus (4:4:4 vs 4:2:2 vs 4:2:0)

                    for (let y = 0; y < maxY; y++) {
                        // OPTIMIZED POINTER ARITHMETIC (Removed x*4 multiplication inside loop)
                        // Old: const rowOffset = rowBase + (y * w * 4) + (ox * 4);
                        let ptr = rowBase + (y * w * 4) + (ox * 4);

                        for (let x = 0; x < maxX; x++) {
                            let Y, Cb, Cr;

                            // --- MODUS LOGIK ---
                            if (mode === '444') {
                                // 4:4:4 (Kein Subsampling): Y, Cb, Cr sind alle 8x8
                                // Blöcke: [Y, Cb, Cr]
                                const pixIdx = y * 8 + x; // Da MCU hier immer 8x8 ist
                                Y  = mcuPix[pixIdx];      // Block 0
                                Cb = mcuPix[64 + pixIdx]; // Block 1 (+64)
                                Cr = mcuPix[128 + pixIdx];// Block 2 (+128)

                            } else if (mode === '422') {
                                // 4:2:2 (Horizontal Subsampling): MCU 16x8
                                // Blöcke: [Y0, Y1, Cb, Cr]
                                // Y Logik: Linke 8px -> Block 0, Rechte 8px -> Block 1
                                const bx = x >> 3; // 0 oder 1
                                const pixIdxY = y * 8 + (x % 8);
                                Y = mcuPix[(bx * 64) + pixIdxY];

                                // Chroma: 16px Breite auf 8px gepresst -> x / 2
                                const cx = x >> 1;
                                const pixIdxC = y * 8 + cx;
                                Cb = mcuPix[128 + pixIdxC]; // Block 2 ist Cb (64*2)
                                Cr = mcuPix[192 + pixIdxC]; // Block 3 ist Cr (64*3)

                            } else {
                                // 4:2:0 (Standard): MCU 16x16
                                // Blöcke: [Y0, Y1, Y2, Y3, Cb, Cr]
                                // Y Logik: 4 Quadranten
                                const bx = x >> 3; // 0 oder 1
                                const by = y >> 3; // 0 oder 1
                                const blkIdx = by * 2 + bx; // 0, 1, 2 oder 3
                                Y = mcuPix[(blkIdx * 64) + (y % 8) * 8 + (x % 8)];

                                // Chroma: 16x16 auf 8x8 -> x/2, y/2
                                const cx = x >> 1;
                                const cy = y >> 1;
                                const cIdx = cy * 8 + cx;
                                Cb = mcuPix[256 + cIdx]; // Block 4 ist Cb (64*4 = 256)
                                Cr = mcuPix[320 + cIdx]; // Block 5 ist Cr (64*5 = 320)
                            }

                            // C. YCbCr -> RGB
                            // Integer-Approximation (Schneller als Float)
                            // R = Y + 1.402 (Cr-128)
                            // G = Y - 0.34414 (Cb-128) - 0.71414 (Cr-128)
                            // B = Y + 1.772 (Cb-128)

                            const adjCb = Cb - 128;
                            const adjCr = Cr - 128;

                            // Pointer increment instead of multiplication (ptr = rowOffset + x*4)
                            finalData[ptr++] = Y + (1.402 * adjCr);
                            finalData[ptr++] = Y - (0.344136 * adjCb) - (0.714136 * adjCr);
                            finalData[ptr++] = Y + (1.772 * adjCb);
                            finalData[ptr++] = 255;
                        }
                    }
                }
            }

            return new ImageData(finalData, w, h);
        }
    },

    // --- 4. TRANSFORMER ---
    Transformer: {
        _transformCoeffs: function(data, op) {
            const out = new Int32Array(64);
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    let val = 0;
                    if (op === 2) val = data[x * 8 + y];
                    else val = data[y * 8 + x];

                    if (op === 0 && (x % 2 !== 0)) val = -val;
                    if (op === 1 && (y % 2 !== 0)) val = -val;

                    out[y * 8 + x] = val;
                }
            }
            return out;
        },

        flipH: function(captured) {
            return this._runGridTransform(captured, 'FLIP_H');
        },

        flipV: function(captured) {
            return this._runGridTransform(captured, 'FLIP_V');
        },

        rotate90: function(captured) {
            return this._runGridTransform(captured, 'ROT_90');
        },

        _runGridTransform: function(captured, mode) {
            const sm = JpegCORE.Constants.SAMPLE_MODES[captured.mode];
            const mcuW = sm.hMax * 8, mcuH = sm.vMax * 8;
            const cols = Math.ceil(captured.w / mcuW);
            const rows = Math.ceil(captured.h / mcuH);
            const blocksPerMCU = sm.blocks.length;

            const newBlocks = [];
            let newW = captured.w, newH = captured.h;
            let newCols = cols, newRows = rows;

            if (mode === 'ROT_90') {
                newW = captured.h; newH = captured.w;
                newCols = rows; newRows = cols;
            }

            const getMCU = (c, r) => {
                const idx = (r * cols + c) * blocksPerMCU;
                return captured.blocks.slice(idx, idx + blocksPerMCU);
            };

            for (let r = 0; r < newRows; r++) {
                for (let c = 0; c < newCols; c++) {
                    let srcC = c, srcR = r;
                    let transformOp = -1;

                    if (mode === 'FLIP_H') {
                        srcC = cols - 1 - c;
                        transformOp = 0;
                    } else if (mode === 'FLIP_V') {
                        srcR = rows - 1 - r;
                        transformOp = 1;
                    } else if (mode === 'ROT_90') {
                        srcC = r;
                        srcR = cols - 1 - c;
                        transformOp = 2;
                    }

                    const srcMCU = getMCU(srcC, srcR);
                    const newMCU = new Array(blocksPerMCU);

                    for (let b = 0; b < blocksPerMCU; b++) {
                        let targetB = b;
                        const bDef = sm.blocks[b];

                        if (captured.mode === '420') {
                            if (bDef.t === 'Y') {
                                if (mode === 'FLIP_H') {
                                    if (b === 0) targetB = 1; else if (b === 1) targetB = 0;
                                    else if (b === 2) targetB = 3; else if (b === 3) targetB = 2;
                                } else if (mode === 'FLIP_V') {
                                    if (b === 0) targetB = 2; else if (b === 2) targetB = 0;
                                    else if (b === 1) targetB = 3; else if (b === 3) targetB = 1;
                                } else if (mode === 'ROT_90') {
                                    if (b === 0) targetB = 1; else if (b === 1) targetB = 3;
                                    else if (b === 3) targetB = 2; else if (b === 2) targetB = 0;
                                }
                            }
                        }

                        let newData = srcMCU[b].data;
                        if (mode === 'ROT_90') {
                            const transposed = this._transformCoeffs(srcMCU[b].data, 2);
                            newData = this._transformCoeffs(transposed, 0);
                        } else {
                            newData = this._transformCoeffs(srcMCU[b].data, transformOp);
                        }

                        newMCU[targetB] = {
                            data: newData,
                            type: srcMCU[b].type,
                            comp: srcMCU[b].comp
                        };
                    }

                    for(let b=0; b<blocksPerMCU; b++) newBlocks.push(newMCU[b]);
                }
            }

            captured.blocks = newBlocks;
            captured.w = newW;
            captured.h = newH;
            return captured;
        }
    },

    // --- 5. GLITCH (v1.7.6 New Methods) ---
    Glitch: {
        swapChannels: function(captured) {
            const sm = JpegCORE.Constants.SAMPLE_MODES[captured.mode];
            const blocksPerMCU = sm.blocks.length;
            let cbIndex = -1, crIndex = -1;
            for(let i=0; i<blocksPerMCU; i++) {
                if(sm.blocks[i].t === 'C') {
                    if(sm.blocks[i].c === 0) cbIndex = i;
                    else crIndex = i;
                }
            }
            if(cbIndex !== -1 && crIndex !== -1) {
                for(let i=0; i < captured.blocks.length; i += blocksPerMCU) {
                    const temp = captured.blocks[i + cbIndex];
                    captured.blocks[i + cbIndex] = captured.blocks[i + crIndex];
                    captured.blocks[i + crIndex] = temp;
                }
            }
            return captured;
        },

        shred: function(captured, threshold) {
            const ZZ = JpegCORE.Constants.ZIG_ZAG_ARR;
            for (let b of captured.blocks) {
                for(let z = threshold; z < 64; z++) {
                    b.data[ZZ[z]] = 0;
                }
            }
            return captured;
        },

        fuzz: function(captured, threshold, amount) {
            const ZZ = JpegCORE.Constants.ZIG_ZAG_ARR;
            for (let b of captured.blocks) {
                for(let z = threshold; z < 64; z++) {
                     if (Math.random() < 0.2) {
                         b.data[ZZ[z]] += (Math.random() - 0.5) * amount;
                     }
                }
            }
            return captured;
        },

        // NEW: Quantization Crush (Deep Fry)
        quantizationCrush: function(captured, factor) {
            // Modifies the quantization tables in place to simulate extreme compression
            [0, 1].forEach(id => {
                if(captured.quantTables[id]) {
                    for(let i=0; i<64; i++) {
                        // Max out at 255 to stay valid 8-bit, but push lower values up
                        let val = captured.quantTables[id][i] * factor;
                        if (val > 255) val = 255;
                        if (val < 1) val = 1;
                        captured.quantTables[id][i] = Math.floor(val);
                    }
                }
            });
            return captured;
        },

        // NEW: Chromatic Aberration
        chromaticAberration: function(captured, offset) {
            // Shifts Cb (comp=1) and Cr (comp=2) blocks by 'offset' in the block array
            if (offset === 0) return captured;

            // 1. Identify all Cb and Cr blocks indices
            const cbIndices = [];
            const crIndices = [];

            for(let i=0; i<captured.blocks.length; i++) {
                if (captured.blocks[i].comp === 1) cbIndices.push(i);
                else if (captured.blocks[i].comp === 2) crIndices.push(i);
            }

            // 2. Helper to shift data
            // We shift the *Data references*, keeping the structure (type/comp) in place
            const shiftChannel = (indices, shift) => {
                const len = indices.length;
                // Safe Modulo
                const safeShift = ((shift % len) + len) % len;
                if (safeShift === 0) return;

                // Copy original data references
                const originalData = indices.map(idx => captured.blocks[idx].data);

                // Apply rotated data to blocks
                for(let i=0; i<len; i++) {
                    // New index in the data source
                    const srcIndex = (i - safeShift + len) % len;
                    captured.blocks[indices[i]].data = originalData[srcIndex];
                }
            };

            // Shift Cb (Blue) negative, Cr (Red) positive for stereo-like separation
            shiftChannel(cbIndices, -offset);
            shiftChannel(crIndices, offset);

            return captured;
        }
    },

    // --- 6. ENCODER (v1.7.7 - Added forceNewQuality) ---
    Encoder: class {
        constructor(quality, customL, customC) {
            const C = JpegCORE.Constants;

            const toNatural = (zz) => {
                const n = new Uint8Array(64);
                const Z = C.ZIG_ZAG_ARR;
                for(let i=0; i<64; i++) n[Z[i]] = zz[i];
                return n;
            };

            if (customL && customC) {
                this.tY = customL;
                this.tC = customC;
            } else {
                const s = quality < 50 ? 5000 / quality : 200 - quality * 2;
                const scale = (tbl) => tbl.map(v => Math.floor((v * s + 50) / 100) || 1);
                this.tY = toNatural(scale(C.QUANT_L));
                this.tC = toNatural(scale(C.QUANT_C));
            }
            const H = C.HUFFMAN;
            this.computeHuffmanTbl(H.DC_L_NR, H.DC_L_VAL, H.AC_L_NR, H.AC_L_VAL, H.DC_C_NR, H.DC_C_VAL, H.AC_C_NR, H.AC_C_VAL);
            this.COS = []; for (let u = 0; u < 8; u++) { this.COS[u] = []; for (let x = 0; x < 8; x++) this.COS[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / 16); }
        }

        computeHuffmanTbl(dcln, dclv, acln, aclv, dccn, dccv, accn, accv) {
            const mh = (L, V) => { let t = [], c = 0, p = 0; for (let i = 1; i <= 16; i++) { for (let j = 0; j < L[i - 1]; j++) { t[V[p++]] = { c, l: i }; c++; } c <<= 1; } return t; };
            this.hLD = mh(dcln, dclv); this.hLA = mh(acln, aclv); this.hCD = mh(dccn, dccv); this.hCA = mh(accn, accv);
            this.curHT = { dcln, dclv, acln, aclv, dccn, dccv, accn, accv };
        }

        dct(b, q) {
            const r = new Int32Array(64);
            for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) {
                let s = 0; for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) s += b[x * 8 + y] * this.COS[u][x] * this.COS[v][y];
                r[u * 8 + v] = Math.round((0.25 * (u === 0 ? 0.70710678 : 1) * (v === 0 ? 0.70710678 : 1) * s) / q[u * 8 + v]);
            }
            return r;
        }

        captureBlocks(imgData, mode) {
            const w = imgData.width, h = imgData.height, d = imgData.data;
            const sm = JpegCORE.Constants.SAMPLE_MODES[mode] || JpegCORE.Constants.SAMPLE_MODES['420'];
            const mcuW = sm.hMax * 8, mcuH = sm.vMax * 8;
            const cols = Math.ceil(w / mcuW), rows = Math.ceil(h / mcuH);
            const allBlocks = [];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const xBase = c * mcuW, yBase = r * mcuH;
                    for (let b = 0; b < sm.blocks.length; b++) {
                        const bDef = sm.blocks[b], isChroma = bDef.t === 'C', qTable = isChroma ? this.tC : this.tY;
                        const blkData = new Float32Array(64);
                        const stepX = isChroma ? sm.hMax : 1, stepY = isChroma ? sm.vMax : 1;
                        const bOffX = bDef.dx * 8, bOffY = bDef.dy * 8;

                        for (let by = 0; by < 8; by++) {
                            for (let bx = 0; bx < 8; bx++) {
                                let sumR = 0, sumG = 0, sumB = 0, count = 0;
                                for (let sy = 0; sy < stepY; sy++) {
                                    for (let sx = 0; sx < stepX; sx++) {
                                        let px = xBase + bOffX * stepX + bx * stepX + sx, py = yBase + bOffY * stepY + by * stepY + sy;
                                        if (px >= w) px = w - 1; if (py >= h) py = h - 1;
                                        const idx = (py * w + px) * 4; sumR += d[idx]; sumG += d[idx + 1]; sumB += d[idx + 2]; count++;
                                    }
                                }
                                const R = sumR / count, G = sumG / count, B = sumB / count;
                                if (!isChroma) blkData[by * 8 + bx] = 0.299 * R + 0.587 * G + 0.114 * B - 128;
                                else blkData[by * 8 + bx] = (bDef.c === 0) ? -0.1687 * R - 0.3313 * G + 0.5 * B : 0.5 * R - 0.4187 * G - 0.0813 * B;
                            }
                        }
                        allBlocks.push({ data: this.dct(blkData, qTable), type: bDef.t, comp: isChroma ? (bDef.c === 0 ? 1 : 2) : 0 });
                    }
                }
            }
            return { blocks: allBlocks, w, h, mode };
        }

        save(captured, metaSegments, forceNewQuality = false) {
            this.buf = []; this.byte = 0; this.cnt = 0;
            const M = JpegCORE.Constants.MARKERS;
            const wr = (v) => { this.buf.push((v >> 8) & 0xFF, v & 0xFF); }, wb = (v) => { this.buf.push(v); };
            const sm = JpegCORE.Constants.SAMPLE_MODES[captured.mode];
            const isGray = (captured.mode === 'GRAY'), numComps = isGray ? 1 : 3;
            const w = captured.w, h = captured.h;

            let qY = this.tY, qC = this.tC;

            // Only use original tables if NOT forced to use new quality
            if (!forceNewQuality && captured.quantTables) {
                if(captured.quantTables[0]) qY = captured.quantTables[0];
                if(captured.quantTables[1]) qC = captured.quantTables[1];
            }

            const toZigZag = (n) => {
                const zz = new Uint8Array(64);
                const Z = JpegCORE.Constants.ZIG_ZAG_ARR;
                for(let i=0; i<64; i++) zz[i] = n[Z[i]];
                return zz;
            };

            wr(0xFF00 | M.SOI);
            if (metaSegments && metaSegments.length > 0) {
                for (let seg of metaSegments) { for (let b of seg) this.buf.push(b); }
            } else {
                wr(0xFF00 | M.APP0); wr(16); [0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0].forEach(wb);
            }

            wr(0xFF00 | M.DQT); wr(132);
            wb(0); toZigZag(qY).forEach(v => wb(v));
            wb(1); toZigZag(qC).forEach(v => wb(v));

            wr(0xFF00 | M.SOF0); wr(8 + 3 * numComps); wb(8); wr(h); wr(w); wb(numComps); wb(1); wb((sm.hMax << 4) | sm.vMax); wb(0);
            if (!isGray) { wb(2); wb(0x11); wb(1); wb(3); wb(0x11); wb(1); }
            let len = 6, ht = this.curHT; [ht.dclv, ht.aclv, ht.dccv, ht.accv].forEach(v => len += 16 + v.length);
            wr(0xFF00 | M.DHT); wr(len); wb(0x00); ht.dcln.forEach(wb); ht.dclv.forEach(wb); wb(0x10); ht.acln.forEach(wb); ht.aclv.forEach(wb); wb(0x01); ht.dccn.forEach(wb); ht.dccv.forEach(wb); wb(0x11); ht.accn.forEach(wb); ht.accv.forEach(wb);
            wr(0xFF00 | M.SOS); wr(6 + 2 * numComps); wb(numComps); wb(1); wb(0); if (!isGray) { wb(2); wb(0x11); wb(3); wb(0x11); } wb(0); wb(63); wb(0);

            let pd = [0, 0, 0];
            for (let i = 0; i < captured.blocks.length; i++) {
                const blkObj = captured.blocks[i], compIdx = blkObj.comp;
                pd[compIdx] = this.ems(blkObj.data, pd[compIdx], compIdx === 0 ? this.hLD : this.hCD, compIdx === 0 ? this.hLA : this.hCA);
            }
            if (this.cnt > 0) this.wbt(0x7F >>> (8 - this.cnt), 8 - this.cnt);
            wr(0xFF00 | M.EOI);
            return new Uint8Array(this.buf);
        }

        ems(b, p, hd, ha) {
            const ZZ = JpegCORE.Constants.ZIG_ZAG_ARR;
            let d = b[0] - p, a = Math.abs(d), l = 0; while (a > 0) { l++; a >>= 1; }
            this.wh(hd, l); if (l > 0) { if (d < 0) d -= 1; this.wbt(d & ((1 << l) - 1), l); }
            let z = 0;
            for (let i = 1; i < 64; i++) {
                let k = ZZ[i];
                if (b[k] === 0) z++;
                else { while (z >= 16) { this.wh(ha, 0xF0); z -= 16; } let v = b[k], av = Math.abs(v), s = 0; while (av > 0) { s++; av >>= 1; } this.wh(ha, (z << 4) | s); if (v < 0) v -= 1; this.wbt(v & ((1 << s) - 1), s); z = 0; }
            }
            if (z > 0) this.wh(ha, 0); return b[0];
        }
        wh(t, v) { const e = t[v]; this.wbt(e.c, e.l); }
        wbt(b, l) { for (let i = l - 1; i >= 0; i--) { this.byte = (this.byte << 1) | ((b >> i) & 1); this.cnt++; if (this.cnt === 8) { this.buf.push(this.byte); if (this.byte === 0xFF) this.buf.push(0); this.byte = 0; this.cnt = 0; } } }
    }
};
