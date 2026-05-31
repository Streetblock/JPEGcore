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
                let infoStr = "", detectedSamp = '420', detectedProgressive = false;
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
                            if (type === M.SOF0 || type === M.SOF2) {
                                detectedProgressive = (type === M.SOF2);
                                const numComps = d[pos + 9];
                                const ySamp = d[pos + 11];
                                if (numComps === 1) detectedSamp = 'GRAY';
                                else if (ySamp === 0x22) detectedSamp = '420';
                                else if (ySamp === 0x21) detectedSamp = '422';
                                else if (ySamp === 0x11) detectedSamp = '444';
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
                    detectedProgressive: detectedProgressive,
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

