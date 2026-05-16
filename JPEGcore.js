/**
* JpegCORE - A pure JavaScript JPEG Encoder/Decoder/Transformer Library
* No external dependencies.
* * Features:
* - Encode (RGB -> JPEG)
* - Decode (JPEG -> RGB via render)
* - Lossless Transforms (Rotate, Flip without re-compression)
 */

const JpegCORE = {
  // --- 1. CONSTANTS ---
  Constants: {
      MARKERS: {
          SOI: 0xD8, EOI: 0xD9, SOF0: 0xC0, SOF2: 0xC2, DHT: 0xC4,
          DQT: 0xDB, SOS: 0xDA, APP0: 0xE0, COM: 0xFE, RST0: 0xD0, RST7: 0xD7
      },
      ZIG_ZAG: [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63],
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
                    for (let i = 0; i < numComps; i++) compMapList.push({ samp: d[pos + 11 + (i * 3)] });
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
                const ZZ = JpegCORE.Constants.ZIG_ZAG;
                let pos = 0, qtL = null, qtC = null;
                const meta = [];
                let infoStr = "", detectedSamp = '420';
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
                // Optional UI log if needed
                // if (infoStr) { const d = document.getElementById('metaInfo'); if(d) d.innerText = "SOURCE: " + infoStr; }

                // Return gathered data for the encoder to reuse
                return {
                    detectedMode: detectedSamp,
                    detectedHuffman: foundCustom ? extractedHuff : null,
                    detectedMetaSegments: meta,
                    customQtL: qtL,
                    customQtC: qtC
                };
            } catch (e) { console.error(e); return null; }
        }
    },

    // --- 3. DECODER ---
    Decoder: {
        // Corrected IDCT Class
        IDCT: class {
            constructor() {
                this.base = [];
                for (let u = 0; u < 8; u++) {
                    this.base[u] = [];
                    for (let x = 0; x < 8; x++) {
                        let Cu = (u === 0) ? 1 / Math.sqrt(2) : 1;
                        this.base[u][x] = Cu * Math.cos(((2 * x + 1) * u * Math.PI) / 16);
                    }
                }
            }
            transform(coeffs, quantTable) {
                const out = new Float32Array(64);
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        let sum = 0;
                        for (let u = 0; u < 8; u++) {
                            for (let v = 0; v < 8; v++) {
                                const coefVal = coeffs[u * 8 + v] * quantTable[u * 8 + v];
                                sum += coefVal * this.base[u][x] * this.base[v][y];
                            }
                        }
                        out[y * 8 + x] = sum * 0.25;
                    }
                }
                return out;
            }
        },

        extractBlocks: async function(file) {
            const buf = await file.arrayBuffer();
            const d = new Uint8Array(buf);
            const M = JpegCORE.Constants.MARKERS, ZZ = JpegCORE.Constants.ZIG_ZAG, SM = JpegCORE.Constants.SAMPLE_MODES;
            let pos = 2, w = 0, h = 0, mcuStructure = null, finalMode = '420', compMapList = [], tables = { 0: {}, 1: {} };
            const mh = (L, V) => { let t = {}, c = 0, p = 0; for (let i = 1; i <= 16; i++) { for (let j = 0; j < L[i - 1]; j++) { let k = ""; for (let x = i - 1; x >= 0; x--)k += (c >> x) & 1; t[k] = V[p++]; c++; } c <<= 1; } return t; };

            if (d[0] !== 0xFF || d[1] !== M.SOI) throw new Error("Not a JPEG");
            while (pos < d.length - 1) {
                if (d[pos] !== 0xFF) { pos++; continue; }
                while (d[pos] === 0xFF && pos < d.length) pos++;
                if (pos >= d.length) break;
                const marker = d[pos];
                if (marker === M.SOS) break;
                const len = (d[pos + 1] << 8) | d[pos + 2], end = pos + 1 + len;
                if (marker === M.SOF0 || marker === M.SOF2) {
                    h = (d[pos + 4] << 8) | d[pos + 5]; w = (d[pos + 6] << 8) | d[pos + 7];
                    const numComps = d[pos + 8]; compMapList = [];
                    for (let i = 0; i < numComps; i++) compMapList.push({ id: d[pos + 10 + (i * 3)], type: (i === 0) ? 0 : (i === 1 ? 1 : 2), samp: d[pos + 11 + (i * 3)] });
                    if (numComps === 1) { finalMode = 'GRAY'; mcuStructure = SM['GRAY']; }
                    else { const ySamp = compMapList[0].samp; mcuStructure = (ySamp === 0x22 ? SM['420'] : (ySamp === 0x21 ? SM['422'] : (ySamp === 0x11 ? SM['444'] : SM['420']))); finalMode = (ySamp === 0x22 ? '420' : (ySamp === 0x21 ? '422' : (ySamp === 0x11 ? '444' : '420'))); }
                } else if (marker === M.DHT) {
                    let subPos = pos + 3; while (subPos < end) { const info = d[subPos++], tc = (info >> 4) & 0x0F, th = info & 0x0F, nr = Array.from(d.slice(subPos, subPos + 16)); subPos += 16; let count = 0; for (let c of nr) count += c; const val = Array.from(d.slice(subPos, subPos + count)); subPos += count; if (!tables[tc]) tables[tc] = {}; tables[tc][th] = mh(nr, val); }
                }
                pos = end;
            }
            if (!mcuStructure) throw new Error("Structure detection failed");
            const blocksPerMCU = mcuStructure.blocks.length, cols = Math.ceil(w / (mcuStructure.hMax * 8)), rows = Math.ceil(h / (mcuStructure.vMax * 8)), totalBlocks = cols * rows * blocksPerMCU;
            const coeffBuffer = new Int32Array(totalBlocks * 64);
            let bp = 0, bb = 0, bc = 0;
            const nb = () => { if (bc === 0) { if (bp >= d.length) return null; let b = d[bp++]; if (b === 0xFF) { let next = d[bp]; if (next === 0) { bp++; } else if (next >= M.RST0 && next <= M.RST7) { bp++; return 'RST'; } else if (next === M.EOI) { return null; } else { return 'MARKER'; } } bb = b; bc = 8; } return (bb >> (--bc)) & 1; };
            const rh = (m) => { let k = ""; while (k.length < 16) { let b = nb(); if (b === 'RST' || b === 'MARKER') return b; if (b === null) return null; k += b; if (m[k] !== undefined) return m[k]; } return null; };
            const rv = (l) => { let v = 0; for (let i = 0; i < l; i++) { let b = nb(); if (b === null || typeof b === 'string') return null; v = (v << 1) | b; } return v < (1 << (l - 1)) ? v + (-1 << l) + 1 : v; };
            function applyRefine(buff, idx, bit, shift) { if (bit === 1) { if (buff[idx] > 0) buff[idx] += (1 << shift); else if (buff[idx] < 0) buff[idx] += (-1 << shift); } }

            pos = 0;
            while (pos < d.length - 1) {
                if (d[pos] !== 0xFF) { pos++; continue; }
                const marker = d[pos + 1];
                if (marker === M.SOS) {
                    const len = (d[pos + 2] << 8) | d[pos + 3], sosEnd = pos + 2 + len;
                    const ns = d[pos + 4], comps = [];
                    for (let i = 0; i < ns; i++) { const cs = d[pos + 5 + i * 2], mapObj = compMapList.find(x => x.id === cs); if (mapObj) comps.push({ type: mapObj.type, dcTbl: (d[pos + 6 + i * 2] >> 4) & 0xF, acTbl: d[pos + 6 + i * 2] & 0xF }); }
                    const Ss = d[sosEnd - 3], Se = d[sosEnd - 2], AhAl = d[sosEnd - 1], Ah = (AhAl >> 4) & 0xF, Al = AhAl & 0xF;
                    bp = sosEnd; bb = 0; bc = 0; let eob_run = 0, predDC = [0, 0, 0];
                    const typeToIndices = {}; for (let b = 0; b < blocksPerMCU; b++) { const def = mcuStructure.blocks[b], t = (def.t === 'C') ? (def.c === 0 ? 1 : 2) : 0; if (!typeToIndices[t]) typeToIndices[t] = []; typeToIndices[t].push(b); }

                    for (let m = 0; m < cols * rows; m++) {
                        for (let c of comps) {
                            const blkIndices = typeToIndices[c.type]; if (!blkIndices) continue;
                            for (let bIdx of blkIndices) {
                                const blockOffset = (m * blocksPerMCU + bIdx) * 64;
                                if (Ss === 0) {
                                    if (Ah === 0) {
                                        const tbl = tables[0][c.dcTbl]; let s = rh(tbl);
                                        if (s === 'RST') { predDC = [0, 0, 0]; bc = 0; eob_run = 0; s = rh(tbl); } if (s === 'MARKER') { pos = bp - 2; m = cols * rows; break; } if (s == null) break;
                                        let diff = 0; if (s) diff = rv(s); predDC[c.type] += diff; coeffBuffer[blockOffset] = predDC[c.type] << Al;
                                    } else { let bit = nb(); if (bit !== 'MARKER' && bit !== null) coeffBuffer[blockOffset] |= (bit << Al); }
                                }
                                if (Se > 0) {
                                    const tbl = tables[1][c.acTbl];
                                    if (eob_run > 0) { eob_run--; if (Ah > 0) { for (let k = Ss; k <= Se; k++) { const idx = blockOffset + ZZ[k]; if (coeffBuffer[idx] !== 0) applyRefine(coeffBuffer, idx, nb(), Al); } } }
                                    else {
                                        let k = Ss;
                                        while (k <= Se) {
                                            let s = rh(tbl); if (s === 'MARKER') { pos = bp - 2; m = cols * rows; break; }
                                            const r = s >> 4, v = s & 15;
                                            if (v === 0) { if (r < 15) { eob_run = (1 << r) + rv(r); eob_run--; if (Ah === 0) break; if (Ah > 0) break; } k += 16; }
                                            else { k += r; const val = rv(v); if (k <= Se) coeffBuffer[blockOffset + ZZ[k]] = val << Al; k++; }
                                        }
                                    }
                                }
                            }
                        }
                        if (pos !== 0 && pos > bp) break;
                    }
                    if (pos === 0) { while (bp < d.length && d[bp] !== 0xFF) bp++; pos = bp - 1; }
                }
                pos++;
            }
            const allBlocks = [];
            for (let i = 0; i < totalBlocks; i++) {
                const off = i * 64, bTypeIndex = i % blocksPerMCU, bDef = mcuStructure.blocks[bTypeIndex], isChroma = bDef.t === 'C';
                allBlocks.push({ data: coeffBuffer.slice(off, off + 64), type: bDef.t, comp: isChroma ? (bDef.c === 0 ? 1 : 2) : 0 });
            }
            return { blocks: allBlocks, w, h, mode: finalMode };
        },

        render: function(decoded) {
            const w = decoded.w;
            const h = decoded.h;
            const mode = decoded.mode;
            const blocks = decoded.blocks;

            const finalData = new Uint8ClampedArray(w * h * 4);
            const idctEngine = new JpegCORE.Decoder.IDCT();
            const SM = JpegCORE.Constants.SAMPLE_MODES[mode];
            const Q_L = JpegCORE.Constants.QUANT_L;
            const Q_C = JpegCORE.Constants.QUANT_C;

            const mcuW = SM.hMax * 8;
            const mcuH = SM.vMax * 8;
            const cols = Math.ceil(w / mcuW);
            const rows = Math.ceil(h / mcuH);
            const blocksPerMCU = SM.blocks.length;

            let bIdx = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const spatialBlocks = [];
                    for (let b = 0; b < blocksPerMCU; b++) {
                        if (bIdx >= blocks.length) break;
                        const rawBlock = blocks[bIdx++];
                        const qTable = (rawBlock.type === 'C') ? Q_C : Q_L;
                        spatialBlocks.push({
                            pixels: idctEngine.transform(rawBlock.data, qTable),
                            def: SM.blocks[b]
                        });
                    }
                    const originX = c * mcuW;
                    const originY = r * mcuH;
                    for (let y = 0; y < mcuH; y++) {
                        for (let x = 0; x < mcuW; x++) {
                            const absX = originX + x;
                            const absY = originY + y;
                            if (absX >= w || absY >= h) continue;
                            let Y = 0, Cb = 0, Cr = 0;
                            for (let sb of spatialBlocks) {
                                if (sb.def.t === 'Y') {
                                    const bxStart = sb.def.dx * 8;
                                    const byStart = sb.def.dy * 8;
                                    if (x >= bxStart && x < bxStart + 8 && y >= byStart && y < byStart + 8) {
                                        Y = sb.pixels[(y - byStart) * 8 + (x - bxStart)];
                                        break;
                                    }
                                }
                            }
                            for (let sb of spatialBlocks) {
                                if (sb.def.t === 'C') {
                                    const scaleX = SM.hMax; const scaleY = SM.vMax;
                                    const cx = Math.floor(x / scaleX);
                                    const cy = Math.floor(y / scaleY);
                                    if (cx < 8 && cy < 8) {
                                        const val = sb.pixels[cy * 8 + cx];
                                        if (sb.def.c === 0) Cb = val; else Cr = val;
                                    }
                                }
                            }
                            const pixelY = Y + 128;
                            const R = pixelY + 1.402 * Cr;
                            const G = pixelY - 0.344136 * Cb - 0.714136 * Cr;
                            const B = pixelY + 1.772 * Cb;
                            const idx = (absY * w + absX) * 4;
                            finalData[idx] = R; finalData[idx + 1] = G; finalData[idx + 2] = B; finalData[idx + 3] = 255;
                        }
                    }
                }
            }
            return new ImageData(finalData, w, h);
        }
    },

    // --- 4. TRANSFORMER (NEW) ---
    Transformer: {
        _transformCoeffs: function(data, op) {
            const out = new Int32Array(64);
            // op: 0=FlipH, 1=FlipV, 2=Transpose
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    let val = 0;
                    if (op === 2) val = data[x * 8 + y]; // Transpose
                    else val = data[y * 8 + x];

                    // Flip H: Odd columns negate
                    if (op === 0 && (x % 2 !== 0)) val = -val;
                    // Flip V: Odd rows negate
                    if (op === 1 && (y % 2 !== 0)) val = -val;
                    // Transpose: No negation needed for simple transpose?
                    // Wait, Rotate 90 is Transpose + FlipH.

                    out[y * 8 + x] = val;
                }
            }
            return out;
        },

        flipH: function(captured) {
            // Logic: Reverse Order of MCUs in row + Flip Coeffs Horizontally
            // For 4:2:0: Also swap Y0<->Y1 and Y2<->Y3 within MCU
            return this._runGridTransform(captured, 'FLIP_H');
        },

        flipV: function(captured) {
            // Logic: Reverse Order of Rows + Flip Coeffs Vertically
            return this._runGridTransform(captured, 'FLIP_V');
        },

        rotate90: function(captured) {
            // 90 CW = Transpose + Flip Horizontal
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

            // Helper to get MCU array from flat list
            const getMCU = (c, r) => {
                const idx = (r * cols + c) * blocksPerMCU;
                return captured.blocks.slice(idx, idx + blocksPerMCU);
            };

            for (let r = 0; r < newRows; r++) {
                for (let c = 0; c < newCols; c++) {
                    let srcC = c, srcR = r;
                    let transformOp = -1; // 0=H, 1=V, 2=Transp

                    if (mode === 'FLIP_H') {
                        srcC = cols - 1 - c;
                        transformOp = 0;
                    } else if (mode === 'FLIP_V') {
                        srcR = rows - 1 - r;
                        transformOp = 1;
                    } else if (mode === 'ROT_90') {
                        // 90 CW: New(x,y) comes from Old(y, H-1-x)
                        // So srcCol = r, srcRow = (oldCols - 1 - c)
                        srcC = r;
                        srcR = cols - 1 - c;
                        transformOp = 2; // Transpose first... then we flip H later?
                        // Actually ROT90 is Transpose Coeffs THEN Flip H Coeffs?
                        // Simplified: Transpose Coeffs, and reorder blocks appropriately
                    }

                    const srcMCU = getMCU(srcC, srcR);
                    const newMCU = new Array(blocksPerMCU);

                    // Reorder blocks INSIDE the MCU (Crucial for 4:2:0)
                    for (let b = 0; b < blocksPerMCU; b++) {
                        let targetB = b;
                        const bDef = sm.blocks[b];

                        // Internal reordering logic
                        if (captured.mode === '420') {
                            // Y Blocks: 0=TL, 1=TR, 2=BL, 3=BR
                            if (bDef.t === 'Y') {
                                if (mode === 'FLIP_H') {
                                    if (b === 0) targetB = 1; else if (b === 1) targetB = 0;
                                    else if (b === 2) targetB = 3; else if (b === 3) targetB = 2;
                                } else if (mode === 'FLIP_V') {
                                    if (b === 0) targetB = 2; else if (b === 2) targetB = 0;
                                    else if (b === 1) targetB = 3; else if (b === 3) targetB = 1;
                                } else if (mode === 'ROT_90') {
                                    // 0 1 -> 2 0
                                    // 2 3 -> 3 1
                                    if (b === 0) targetB = 1; else if (b === 1) targetB = 3;
                                    else if (b === 3) targetB = 2; else if (b === 2) targetB = 0;
                                }
                            }
                        }

                        // Apply Coefficient Transform
                        let newData = srcMCU[b].data;
                        if (mode === 'ROT_90') {
                            // 90 is special: Transpose THEN FlipH (on rows)
                            // We do this manually:
                            const transposed = this._transformCoeffs(srcMCU[b].data, 2);
                            newData = this._transformCoeffs(transposed, 0); // Flip H
                        } else {
                            newData = this._transformCoeffs(srcMCU[b].data, transformOp);
                        }

                        newMCU[targetB] = {
                            data: newData,
                            type: srcMCU[b].type,
                            comp: srcMCU[b].comp
                        };
                    }

                    // Add reordered/transformed MCU to linear list
                    for(let b=0; b<blocksPerMCU; b++) newBlocks.push(newMCU[b]);
                }
            }

            captured.blocks = newBlocks;
            captured.w = newW;
            captured.h = newH;
            return captured;
        }
    },

    // --- 5. ENCODER ---
    Encoder: class {
        constructor(quality, customL, customC) {
            const C = JpegCORE.Constants;
            if (customL && customC) { this.tY = customL; this.tC = customC; }
            else {
                const s = quality < 50 ? 5000 / quality : 200 - quality * 2;
                const scale = (tbl) => tbl.map(v => Math.floor((v * s + 50) / 100) || 1);
                this.tY = scale(C.QUANT_L); this.tC = scale(C.QUANT_C);
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

        save(captured, metaSegments) {
            this.buf = []; this.byte = 0; this.cnt = 0;
            const M = JpegCORE.Constants.MARKERS;
            const wr = (v) => { this.buf.push((v >> 8) & 0xFF, v & 0xFF); }, wb = (v) => { this.buf.push(v); };
            const sm = JpegCORE.Constants.SAMPLE_MODES[captured.mode];
            const isGray = (captured.mode === 'GRAY'), numComps = isGray ? 1 : 3;
            const w = captured.w, h = captured.h;

            wr(0xFF00 | M.SOI);
            if (metaSegments) { for (let seg of metaSegments) { for (let b of seg) this.buf.push(b); } }
            else { wr(0xFF00 | M.APP0); wr(16); [0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0].forEach(wb); }
            wr(0xFF00 | M.DQT); wr(132); wb(0); this.tY.forEach(v => wb(v)); wb(1); this.tC.forEach(v => wb(v));
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
            const ZZ = JpegCORE.Constants.ZIG_ZAG;
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
