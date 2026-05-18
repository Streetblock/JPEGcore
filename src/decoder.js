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

                // --- Pass 1: Rows ---
                for (let i = 0; i < 8; ++i) {
                    const row = 8 * i, blkRow = inOffset + row;

                    // Zero AC check: If all AC coefficients are 0, we can skip the heavy math.
                    if ((inBuffer[blkRow+1] | inBuffer[blkRow+2] | inBuffer[blkRow+3] |
                         inBuffer[blkRow+4] | inBuffer[blkRow+5] | inBuffer[blkRow+6] | inBuffer[blkRow+7]) === 0) {
                        // Precision Fix: Use 11-bit shift for DC scaling to match Loeffler standards
                        t = (5793 * (inBuffer[blkRow] * qt[row]) + 512) >> 10;
                        p[row]=t; p[row+1]=t; p[row+2]=t; p[row+3]=t; p[row+4]=t; p[row+5]=t; p[row+6]=t; p[row+7]=t;
                        continue;
                    }

                    // Standard Loeffler stages with fixed-point constants
                    v0 = (5793 * (inBuffer[blkRow+0] * qt[row+0]) + 128) >> 8;
                    v1 = (5793 * (inBuffer[blkRow+4] * qt[row+4]) + 128) >> 8;
                    v2 = inBuffer[blkRow+2] * qt[row+2]; v3 = inBuffer[blkRow+6] * qt[row+6];
                    v4 = (2896 * ((inBuffer[blkRow+1] * qt[row+1]) - (inBuffer[blkRow+7] * qt[row+7])) + 128) >> 8;
                    v7 = (2896 * ((inBuffer[blkRow+1] * qt[row+1]) + (inBuffer[blkRow+7] * qt[row+7])) + 128) >> 8;
                    v5 = (inBuffer[blkRow+3] * qt[row+3]) << 4; v6 = (inBuffer[blkRow+5] * qt[row+5]) << 4;

                    t = (v0 - v1 + 1) >> 1; v0 = (v0 + v1 + 1) >> 1; v1 = t;
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

                // --- Pass 2: Columns ---
                for (let i = 0; i < 8; ++i) {
                    const col = i;
                    if ((p[8+col] | p[16+col] | p[24+col] | p[32+col] | p[40+col] | p[48+col] | p[56+col]) === 0) {
                        t = (5793 * p[col] + 8192) >> 14;
                        t = 128 + ((t + 8) >> 4);
                        // Strict clamping to 0-255 range
                        const clamped = t < 0 ? 0 : (t > 255 ? 255 : t);
                        for(let k=0; k<64; k+=8) outBuffer[outOffset+col+k] = clamped;
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
                    // Optimized clamping and offset addition
                    let val;
                    val = 128 + ((v0 + v7 + 8) >> 4); outBuffer[o]    = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v1 + v6 + 8) >> 4); outBuffer[o+8]  = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v2 + v5 + 8) >> 4); outBuffer[o+16] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v3 + v4 + 8) >> 4); outBuffer[o+24] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v3 - v4 + 8) >> 4); outBuffer[o+32] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v2 - v5 + 8) >> 4); outBuffer[o+40] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v1 - v6 + 8) >> 4); outBuffer[o+48] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    val = 128 + ((v0 - v7 + 8) >> 4); outBuffer[o+56] = val < 0 ? 0 : (val > 255 ? 255 : val);
                }
            }

            /*_transformLoefflerInt(inBuffer, inOffset, qt, outBuffer, outOffset) {
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
            }*/
        },

        // --- 2. HYBRID DECODER (Final Fix: RST + Progressive EOB Refinement) ---

        extractBlocksStruct: async function(file) {
            try {
                const buf = await file.arrayBuffer();
                const d = new Uint8Array(buf);
                const M = JpegCORE.Constants.MARKERS, ZZ = JpegCORE.Constants.ZIG_ZAG, SM = JpegCORE.Constants.SAMPLE_MODES;
                const H = JpegCORE.Constants.HUFFMAN;
                const MAX_DIMENSION =  JpegCORE.Constants.MAX_DIMENSION;

                // Wir nutzen die neuen Utility-Funktionen
                const utils = JpegCORE.Utils;
                const makeTree = utils.makeHuffmanTree;

                // STATUS CODES
                const STAT_MARKER = -1;
                const STAT_RST = -2;

                // --- Robust Bit Reader Instanz ---
                // Wir erstellen den Reader. Er bekommt das Daten-Array 'd'.
                // WICHTIG: Wir übergeben 'pos' erst dann, wenn der eigentliche Scan beginnt,
                // oder wir initialisieren ihn hier mit 0 und setzen die Position später.
                const reader = new JpegCORE.Utils.BitReader(d, 0);


                // Wir binden 'nb' einfach an die Methode der Klasse.
                // So muss der restliche Code (rh, rv, readRawBits) noch nicht geändert werden.
                const nb = () => reader.nextBit();

                // Die Hilfsfunktionen nutzen nun intern den 'reader' über 'nb'
                const readRawBits = (l) => reader.readRaw(l);
                const rh = (node) => reader.readHuffman(node);
                const rv = (l) => reader.readSigned(l);//*/

                // --- Robust Bit Reader ---
                /*let bp = 0, bb = 0, bc = 0;
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
                };//*/

                //erstezt durch makeHuffman
                /*const mh = (L, V) => {
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
                };//*/

                // --- Parser Header ---
                if (d.length < 2) throw new Error("File too short");
                let pos = 0, w = 0, h = 0, mcuStructure = null, finalMode = '420', compMapList = [];
                let isProgressive = false;
                let tables = { 0: { 0: makeTree(H.DC_L_NR, H.DC_L_VAL), 1: makeTree(H.DC_C_NR, H.DC_C_VAL) }, 1: { 0: makeTree(H.AC_L_NR, H.AC_L_VAL), 1: makeTree(H.AC_C_NR, H.AC_C_VAL) } };
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
                        isProgressive = (marker === M.SOF2);
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
                            tables[tc][th] = makeTree(nr, val);
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
                if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
                    throw new Error(`Bildmaße zu groß: ${w}x${h}`);
                }

                // Progressive fallback:
                // Prefer native browser decoding path (no external dependency).
                if (isProgressive && JpegCORE.Config.nativeProgressiveDecode) {
                    const hasCreateImageBitmap = (typeof createImageBitmap === 'function');
                    const hasOffscreenCanvas = (typeof OffscreenCanvas !== 'undefined');
                    const hasDomCanvas = (typeof document !== 'undefined' && typeof document.createElement === 'function');
                    if (hasCreateImageBitmap && (hasOffscreenCanvas || hasDomCanvas)) {
                        try {
                            const bitmap = await createImageBitmap(file, { imageOrientation: "none" });
                            const canvas = hasOffscreenCanvas ? new OffscreenCanvas(bitmap.width, bitmap.height) : document.createElement('canvas');
                            if (!hasOffscreenCanvas) { canvas.width = bitmap.width; canvas.height = bitmap.height; }
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            if (ctx) {
                                ctx.drawImage(bitmap, 0, 0);
                                const img = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
                                if (typeof bitmap.close === 'function') bitmap.close();
                                return {
                                    preDecodedData: img.data,
                                    w: bitmap.width,
                                    h: bitmap.height,
                                    mode: 'RGBA_NATIVE',
                                    quantTables: {},
                                    compMap: [],
                                    isProgressiveFallback: true,
                                    decodeBackend: 'native'
                                };
                            }
                        } catch (nativeDecodeErr) {
                            // Continue with other fallback options.
                        }
                    }
                }

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
                const compBlockOrderCache = {};
                const compBlockOffsetsCache = {};

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
                                if (mapObj) {
                                    const dcTbl = (tdta >> 4) & 0xF;
                                    const acTbl = tdta & 0xF;
                                    comps.push({
                                        type: mapObj.type,
                                        dcTbl,
                                        acTbl,
                                        dcNode: (tables[0][dcTbl]) ? tables[0][dcTbl] : tables[0][0],
                                        acNode: (tables[1][acTbl]) ? tables[1][acTbl] : tables[1][0]
                                    });
                                }
                            }
                            if (comps.length === 0) comps.push({type:0, dcTbl:0, acTbl:0});

                            const Ss = d[sosEnd - 3], Se = d[sosEnd - 2], AhAl = d[sosEnd - 1];
                            const Ah = (AhAl >> 4) & 0xF, Al = AhAl & 0xF;
                            const kStart = (Ss > 1) ? Ss : 1;
                            const coeff = coeffBuffer;
                            const zig = ZZ;

                            // WICHTIG: BitReader auf den Start der Bilddaten setzen
                            reader.pos= sosEnd;
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
                            // For non-interleaved scans (Ns=1), JPEG requires component blocks
                            // in left-to-right/top-to-bottom component raster order.
                            const buildCompBlockOrder = (compType) => {
                                if (compBlockOrderCache[compType]) return compBlockOrderCache[compType];
                                const blkIndices = typeToIndices[compType] || [];
                                if (blkIndices.length === 0) { compBlockOrderCache[compType] = []; return compBlockOrderCache[compType]; }

                                let hComp = 0, vComp = 0;
                                const subToBIdx = [];
                                for (const bIdx of blkIndices) {
                                    const def = mcuStructure.blocks[bIdx];
                                    if (def.dx + 1 > hComp) hComp = def.dx + 1;
                                    if (def.dy + 1 > vComp) vComp = def.dy + 1;
                                    subToBIdx[(def.dy * 8) + def.dx] = bIdx;
                                }

                                const ordered = [];
                                // For non-interleaved scans, decode only the component's real block raster
                                // (not the padded MCU grid for other components).
                                const compCols = Math.ceil((w * hComp) / (mcuStructure.hMax * 8));
                                const compRows = Math.ceil((h * vComp) / (mcuStructure.vMax * 8));
                                for (let by = 0; by < compRows; by++) {
                                    const mcuY = (by / vComp) | 0;
                                    const subY = by % vComp;
                                    for (let bx = 0; bx < compCols; bx++) {
                                        const mcuX = (bx / hComp) | 0;
                                        const subX = bx % hComp;
                                        const bIdx = subToBIdx[(subY * 8) + subX];
                                        if (bIdx === undefined) continue;
                                        const m = mcuY * cols + mcuX;
                                        ordered.push(m * blocksPerMCU + bIdx);
                                    }
                                }
                                compBlockOrderCache[compType] = ordered;
                                const offsets = new Int32Array(ordered.length);
                                for (let i = 0; i < ordered.length; i++) offsets[i] = ordered[i] * 64;
                                compBlockOffsetsCache[compType] = offsets;
                                return ordered;
                            };

                            let markerFound = false;

                            const decodeDCFirst = (blockOffset, c) => {
                                let s = rh(c.dcNode);
                                if (s === STAT_RST) { predDC = [0, 0, 0]; s = rh(c.dcNode); }
                                if (s === STAT_MARKER || s === null) { markerFound = true; return; }
                                let diff = (s === 0) ? 0 : rv(s);
                                if (diff === null) { markerFound = true; return; }
                                predDC[c.type] += diff;
                                coeff[blockOffset] = predDC[c.type] << Al;
                            };
                            const decodeDCSuccessive = (blockOffset) => {
                                let bit = nb();
                                if (bit === STAT_MARKER || bit === null) { markerFound = true; return; }
                                if (bit === 1) coeff[blockOffset] |= (1 << Al);
                            };
                            const decodeACFirst = (blockOffset, c) => {
                                if (eob_run > 0) { eob_run--; return; }
                                let k = kStart;
                                while (k <= Se) {
                                    let rs = rh(c.acNode);
                                    if (rs === STAT_MARKER || rs === STAT_RST || rs === null) { markerFound = true; break; }
                                    const r = rs >> 4, s = rs & 15;
                                    if (s === 0) {
                                        if (r < 15) {
                                            let extra = readRawBits(r);
                                            if (extra === STAT_MARKER || extra === STAT_RST || extra === null) { markerFound = true; break; }
                                            eob_run = (1 << r) + extra - 1;
                                            break;
                                        }
                                        k += 15;
                                    } else {
                                        k += r;
                                        let val = rv(s);
                                        if (val === null) { markerFound = true; break; }
                                        if (k <= Se) coeff[blockOffset + zig[k]] = val << Al;
                                    }
                                    k++;
                                }
                            };
                            const decodeACSuccessive = (blockOffset, c) => {
                                const p1 = 1 << Al, m1 = (-1) << Al;
                                let k = kStart;
                                while (k <= Se) {
                                    const idx = blockOffset + zig[k];
                                    const direction = coeff[idx] < 0 ? -1 : 1;
                                    switch (successiveACState) {
                                        case 0: {
                                            let rs = rh(c.acNode);
                                            if (rs === STAT_MARKER || rs === STAT_RST || rs === null) { markerFound = true; break; }
                                            const s = rs & 15;
                                            acRun = rs >> 4;
                                            if (s === 0) {
                                                if (acRun < 15) {
                                                    let extra = readRawBits(acRun);
                                                    if (extra === STAT_MARKER || extra === STAT_RST || extra === null) { markerFound = true; break; }
                                                    eob_run = (1 << acRun) + extra;
                                                    successiveACState = 4;
                                                } else {
                                                    acRun = 16;
                                                    successiveACState = 1;
                                                }
                                            } else {
                                                if (s !== 1) { markerFound = true; break; }
                                                let nextValue = rv(s);
                                                if (nextValue === null) { markerFound = true; break; }
                                                successiveACNextValue = nextValue;
                                                successiveACState = acRun ? 2 : 3;
                                            }
                                            continue;
                                        }
                                        case 1:
                                        case 2: {
                                            if (coeff[idx] !== 0) {
                                                let bit = nb();
                                                if (bit === STAT_MARKER || bit === STAT_RST || bit === null) { markerFound = true; break; }
                                                if (bit === 1) coeff[idx] += (direction > 0) ? p1 : m1;
                                            } else {
                                                acRun--;
                                                if (acRun === 0) successiveACState = (successiveACState === 2) ? 3 : 0;
                                            }
                                            break;
                                        }
                                        case 3: {
                                            if (coeff[idx] !== 0) {
                                                let bit = nb();
                                                if (bit === STAT_MARKER || bit === STAT_RST || bit === null) { markerFound = true; break; }
                                                if (bit === 1) coeff[idx] += (direction > 0) ? p1 : m1;
                                            } else {
                                                coeff[idx] = successiveACNextValue << Al;
                                                successiveACState = 0;
                                            }
                                            break;
                                        }
                                        case 4: {
                                            if (coeff[idx] !== 0) {
                                                let bit = nb();
                                                if (bit === STAT_MARKER || bit === STAT_RST || bit === null) { markerFound = true; break; }
                                                if (bit === 1) coeff[idx] += (direction > 0) ? p1 : m1;
                                            }
                                            break;
                                        }
                                    }
                                    if (markerFound) break;
                                    k++;
                                }
                                if (!markerFound && successiveACState === 4) {
                                    eob_run--;
                                    if (eob_run === 0) successiveACState = 0;
                                }
                            };
                            const decodeBaselineSequential = (blockOffset, c) => {
                                let s = rh(c.dcNode);
                                if (s === STAT_RST) { predDC = [0, 0, 0]; s = rh(c.dcNode); }
                                if (s === STAT_MARKER || s === null) { markerFound = true; return; }
                                let diff = (s === 0) ? 0 : rv(s);
                                if (diff === null) { markerFound = true; return; }
                                predDC[c.type] += diff;
                                coeff[blockOffset] = predDC[c.type];

                                let k = 1;
                                while (k < 64) {
                                    let rs = rh(c.acNode);
                                    if (rs === STAT_MARKER || rs === STAT_RST || rs === null) { markerFound = true; break; }
                                    const r = rs >> 4, acs = rs & 15;
                                    if (acs === 0) {
                                        if (r < 15) break;
                                        k += 16;
                                        continue;
                                    }
                                    k += r;
                                    let val = rv(acs);
                                    if (val === null) { markerFound = true; break; }
                                    if (k < 64) coeff[blockOffset + zig[k]] = val;
                                    k++;
                                }
                            };

                            let decodeBlockFn;
                            if (Ss === 0 && Se === 63 && Ah === 0) {
                                decodeBlockFn = (blockOffset, c) => decodeBaselineSequential(blockOffset, c);
                            } else if (Ss === 0) {
                                decodeBlockFn = (Ah === 0)
                                    ? (blockOffset, c) => decodeDCFirst(blockOffset, c)
                                    : (blockOffset) => decodeDCSuccessive(blockOffset);
                            } else if (Ah === 0) {
                                decodeBlockFn = (blockOffset, c) => decodeACFirst(blockOffset, c);
                            } else {
                                decodeBlockFn = (blockOffset, c) => decodeACSuccessive(blockOffset, c);
                            }

                            if (ns === 1 && comps.length === 1) {
                                const c = comps[0];
                                if (!compBlockOffsetsCache[c.type]) buildCompBlockOrder(c.type);
                                const orderedOffsets = compBlockOffsetsCache[c.type] || new Int32Array(0);
                                for (let i = 0; i < orderedOffsets.length; i++) {
                                    const blockOffset = orderedOffsets[i];
                                    if (blockOffset + 64 > coeffBuffer.length) { markerFound = true; break; }
                                    decodeBlockFn(blockOffset, c);
                                    if (markerFound) break;
                                }
                            } else {
                                for (let m = 0; m < cols * rows; m++) {
                                    for (let c of comps) {
                                        const blkIndices = typeToIndices[c.type];
                                        if (!blkIndices) continue;
                                        for (let bIdx of blkIndices) {
                                            const blockOffset = (m * blocksPerMCU + bIdx) * 64;
                                            if (blockOffset + 64 > coeffBuffer.length) { markerFound = true; break; }
                                            decodeBlockFn(blockOffset, c);
                                            if (markerFound) break;
                                        }
                                        if (markerFound) break;
                                    }
                                    if (markerFound) break;
                                }
                            }

                            // FIX: Synchronisiere die Stream-Position für den nächsten Scan.
                            // BitReader stoppt bei 0xFF + MarkerByte und lässt pos auf MarkerByte.
                            // Der Segment-Parser unten erwartet dagegen, dass pos auf 0xFF zeigt.
                            pos = reader.pos;
                            if (pos > 0 && pos < d.length && d[pos] !== 0xFF && d[pos - 1] === 0xFF) {
                                pos--;
                            }

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
                                tables[tc][th] = makeTree(nr, val);
                            }
                            pos = end;
                        } else if (marker === M.EOI) { break; }
                        else { const len = (d[pos + 1] << 8) | d[pos + 2]; pos += 1 + len; }
                    }
                } catch (e) { console.warn("Robust Decode Warning:", e); }

                return { coeffBuffer, blockList, w, h, mode: finalMode, quantTables, compMap: compMapList, decodeBackend: 'internal' };

            } catch (globalErr) {
                console.error("Critical Decoder Failure:", globalErr);
                return { blocks: [], w: 0, h: 0, mode: '420', quantTables: {}, compMap: [] };
            }
        },//*/

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

            if (decoded.preDecodedData && decoded.w && decoded.h) {
                const srcW = decoded.w, srcH = decoded.h;
                if (scale === 1.0) return new ImageData(new Uint8ClampedArray(decoded.preDecodedData), srcW, srcH);
                const w = Math.max(1, Math.ceil(srcW * scale));
                const h = Math.max(1, Math.ceil(srcH * scale));
                const out = new Uint8ClampedArray(w * h * 4);
                for (let y = 0; y < h; y++) {
                    const sy = Math.min(srcH - 1, Math.floor(y / scale));
                    for (let x = 0; x < w; x++) {
                        const sx = Math.min(srcW - 1, Math.floor(x / scale));
                        const sIdx = (sy * srcW + sx) * 4;
                        const dIdx = (y * w + x) * 4;
                        out[dIdx] = decoded.preDecodedData[sIdx];
                        out[dIdx + 1] = decoded.preDecodedData[sIdx + 1];
                        out[dIdx + 2] = decoded.preDecodedData[sIdx + 2];
                        out[dIdx + 3] = decoded.preDecodedData[sIdx + 3];
                    }
                }
                return new ImageData(out, w, h);
            }
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

            if (mode === '420' && blockSize === 8) {
                for (let r = 0; r < rows; r++) {
                    const rowBase = r * mcuH * w * 4;

                    for (let c = 0; c < cols; c++) {
                        for (let b = 0; b < 6; b++) {
                             if (bIdx >= blockList.length) break;
                             const meta = blockList[bIdx];
                             const qt = compQT[meta.comp] || compQT[0];
                             if (isFlatBuffer) {
                                 idct.transform(buffer, bIdx * 64, qt, 8, mcuPix, b * 64);
                             } else {
                                 idct.transform(meta.data, 0, qt, 8, mcuPix, b * 64);
                             }
                             bIdx++;
                        }

                        const ox = c * 16;
                        const oy = r * 16;
                        const maxY = Math.min(16, h - oy);
                        const maxX = Math.min(16, w - ox);
                        const leftX = Math.min(maxX, 8);

                        for (let y = 0; y < maxY; y++) {
                            let ptr = rowBase + (y * w * 4) + (ox * 4);
                            const yBlockBase = y < 8 ? 0 : 128;
                            const yRow = (y & 7) * 8;
                            const cRow = (y >> 1) * 8;

                            let x = 0;
                            const leftBase = yBlockBase + yRow;
                            for (; x + 1 < leftX; x += 2) {
                                const cIdx = cRow + (x >> 1);
                                const Cb = mcuPix[256 + cIdx] - 128;
                                const Cr = mcuPix[320 + cIdx] - 128;
                                const rAdd = (91881 * Cr) >> 16;
                                const gAdd = ((-22554 * Cb) - (46802 * Cr)) >> 16;
                                const bAdd = (116130 * Cb) >> 16;
                                let Y = mcuPix[leftBase + x];
                                finalData[ptr++] = Y + rAdd;
                                finalData[ptr++] = Y + gAdd;
                                finalData[ptr++] = Y + bAdd;
                                finalData[ptr++] = 255;
                                Y = mcuPix[leftBase + x + 1];
                                finalData[ptr++] = Y + rAdd;
                                finalData[ptr++] = Y + gAdd;
                                finalData[ptr++] = Y + bAdd;
                                finalData[ptr++] = 255;
                            }
                            if (x < leftX) {
                                const cIdx = cRow + (x >> 1);
                                const Cb = mcuPix[256 + cIdx] - 128;
                                const Cr = mcuPix[320 + cIdx] - 128;
                                const rAdd = (91881 * Cr) >> 16;
                                const gAdd = ((-22554 * Cb) - (46802 * Cr)) >> 16;
                                const bAdd = (116130 * Cb) >> 16;
                                const Y = mcuPix[leftBase + x];
                                finalData[ptr++] = Y + rAdd;
                                finalData[ptr++] = Y + gAdd;
                                finalData[ptr++] = Y + bAdd;
                                finalData[ptr++] = 255;
                            }

                            const rightBase = yBlockBase + 64 + yRow;
                            for (x = 8; x + 1 < maxX; x += 2) {
                                const cIdx = cRow + (x >> 1);
                                const Cb = mcuPix[256 + cIdx] - 128;
                                const Cr = mcuPix[320 + cIdx] - 128;
                                const rAdd = (91881 * Cr) >> 16;
                                const gAdd = ((-22554 * Cb) - (46802 * Cr)) >> 16;
                                const bAdd = (116130 * Cb) >> 16;
                                let Y = mcuPix[rightBase + (x - 8)];
                                finalData[ptr++] = Y + rAdd;
                                finalData[ptr++] = Y + gAdd;
                                finalData[ptr++] = Y + bAdd;
                                finalData[ptr++] = 255;
                                Y = mcuPix[rightBase + (x - 7)];
                                finalData[ptr++] = Y + rAdd;
                                finalData[ptr++] = Y + gAdd;
                                finalData[ptr++] = Y + bAdd;
                                finalData[ptr++] = 255;
                            }
                            if (x < maxX) {
                                const cIdx = cRow + (x >> 1);
                                const Cb = mcuPix[256 + cIdx] - 128;
                                const Cr = mcuPix[320 + cIdx] - 128;
                                const rAdd = (91881 * Cr) >> 16;
                                const gAdd = ((-22554 * Cb) - (46802 * Cr)) >> 16;
                                const bAdd = (116130 * Cb) >> 16;
                                const Y = mcuPix[rightBase + (x - 8)];
                                finalData[ptr++] = Y + rAdd;
                                finalData[ptr++] = Y + gAdd;
                                finalData[ptr++] = Y + bAdd;
                                finalData[ptr++] = 255;
                            }
                        }
                    }
                }

                return new ImageData(finalData, w, h);
            }

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

