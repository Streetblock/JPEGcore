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
            this.aanScaleY = this.buildAanScale(this.tY);
            this.aanScaleC = this.buildAanScale(this.tC);
            this.buildMagnitudeTables();
        }

        buildMagnitudeTables() {
            const cached = this.constructor._magTables;
            if (cached) {
                this.magOffset = cached.offset;
                this.magLen = cached.len;
                this.magBits = cached.bits;
                return;
            }
            const size = 65535, offset = 32767;
            const len = new Uint8Array(size);
            const bits = new Uint16Array(size);
            for (let l = 1, lo = 1, hi = 2; l <= 15; l++, lo <<= 1, hi <<= 1) {
                for (let v = lo; v < hi; v++) {
                    len[offset + v] = l;
                    bits[offset + v] = v;
                    const n = -v;
                    len[offset + n] = l;
                    bits[offset + n] = hi - 1 + n;
                }
            }
            this.constructor._magTables = { offset, len, bits };
            this.magOffset = offset;
            this.magLen = len;
            this.magBits = bits;
        }

        buildDctScale(q) {
            const scale = new Float64Array(64);
            for (let u = 0; u < 8; u++) {
                const uScale = 0.25 * (u === 0 ? 0.70710678 : 1);
                for (let v = 0; v < 8; v++) {
                    const out = u * 8 + v;
                    scale[out] = (uScale * (v === 0 ? 0.70710678 : 1)) / q[out];
                }
            }
            return scale;
        }

        buildDctBasis(scale) {
            const basis = new Float64Array(4096);
            const COS = this.COS;
            for (let u = 0; u < 8; u++) {
                const cu = COS[u];
                for (let v = 0; v < 8; v++) {
                    const cv = COS[v];
                    const out = u * 8 + v;
                    const base = out * 64;
                    const coeffScale = scale[out];
                    for (let x = 0; x < 8; x++) {
                        const rowBase = x * 8;
                        const ux = cu[x] * coeffScale;
                        for (let y = 0; y < 8; y++) basis[base + rowBase + y] = ux * cv[y];
                    }
                }
            }
            return basis;
        }

        buildAanScale(q) {
            const aasf = [1.0, 1.387039845, 1.306562965, 1.175875602, 1.0, 0.785694958, 0.541196100, 0.275899379];
            const scale = new Float64Array(64);
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const i = row * 8 + col;
                    scale[i] = 1.0 / (q[i] * aasf[row] * aasf[col] * 8.0);
                }
            }
            return scale;
        }

        computeHuffmanTbl(dcln, dclv, acln, aclv, dccn, dccv, accn, accv) {
            const mh = (L, V) => { let t = [], c = 0, p = 0; for (let i = 1; i <= 16; i++) { for (let j = 0; j < L[i - 1]; j++) { t[V[p++]] = { c, l: i }; c++; } c <<= 1; } return t; };
            this.hLD = mh(dcln, dclv); this.hLA = mh(acln, aclv); this.hCD = mh(dccn, dccv); this.hCA = mh(accn, accv);
            this.curHT = { dcln, dclv, acln, aclv, dccn, dccv, accn, accv };
        }

        dct(b, basis) {
            const r = new Int32Array(64);
            for (let out = 0; out < 64; out++) {
                const base = out * 64;
                let s = 0;
                for (let i = 0; i < 64; i++) s += b[i] * basis[base + i];
                r[out] = Math.round(s);
            }
            return r;
        }

        fdctAan(data, scale, out) {
            const r = out || new Int32Array(64);
            let d0, d1, d2, d3, d4, d5, d6, d7;
            let off = 0;

            for (let i = 0; i < 8; i++) {
                d0 = data[off]; d1 = data[off + 1]; d2 = data[off + 2]; d3 = data[off + 3];
                d4 = data[off + 4]; d5 = data[off + 5]; d6 = data[off + 6]; d7 = data[off + 7];

                let tmp0 = d0 + d7, tmp7 = d0 - d7;
                let tmp1 = d1 + d6, tmp6 = d1 - d6;
                let tmp2 = d2 + d5, tmp5 = d2 - d5;
                let tmp3 = d3 + d4, tmp4 = d3 - d4;
                let tmp10 = tmp0 + tmp3, tmp13 = tmp0 - tmp3;
                let tmp11 = tmp1 + tmp2, tmp12 = tmp1 - tmp2;

                data[off] = tmp10 + tmp11;
                data[off + 4] = tmp10 - tmp11;
                const z1 = (tmp12 + tmp13) * 0.707106781;
                data[off + 2] = tmp13 + z1;
                data[off + 6] = tmp13 - z1;

                tmp10 = tmp4 + tmp5;
                tmp11 = tmp5 + tmp6;
                tmp12 = tmp6 + tmp7;
                const z5 = (tmp10 - tmp12) * 0.382683433;
                const z2 = 0.541196100 * tmp10 + z5;
                const z4 = 1.306562965 * tmp12 + z5;
                const z3 = tmp11 * 0.707106781;
                const z11 = tmp7 + z3, z13 = tmp7 - z3;

                data[off + 5] = z13 + z2;
                data[off + 3] = z13 - z2;
                data[off + 1] = z11 + z4;
                data[off + 7] = z11 - z4;
                off += 8;
            }

            off = 0;
            for (let i = 0; i < 8; i++) {
                d0 = data[off]; d1 = data[off + 8]; d2 = data[off + 16]; d3 = data[off + 24];
                d4 = data[off + 32]; d5 = data[off + 40]; d6 = data[off + 48]; d7 = data[off + 56];

                let tmp0 = d0 + d7, tmp7 = d0 - d7;
                let tmp1 = d1 + d6, tmp6 = d1 - d6;
                let tmp2 = d2 + d5, tmp5 = d2 - d5;
                let tmp3 = d3 + d4, tmp4 = d3 - d4;
                let tmp10 = tmp0 + tmp3, tmp13 = tmp0 - tmp3;
                let tmp11 = tmp1 + tmp2, tmp12 = tmp1 - tmp2;

                data[off] = tmp10 + tmp11;
                data[off + 32] = tmp10 - tmp11;
                const z1 = (tmp12 + tmp13) * 0.707106781;
                data[off + 16] = tmp13 + z1;
                data[off + 48] = tmp13 - z1;

                tmp10 = tmp4 + tmp5;
                tmp11 = tmp5 + tmp6;
                tmp12 = tmp6 + tmp7;
                const z5 = (tmp10 - tmp12) * 0.382683433;
                const z2 = 0.541196100 * tmp10 + z5;
                const z4 = 1.306562965 * tmp12 + z5;
                const z3 = tmp11 * 0.707106781;
                const z11 = tmp7 + z3, z13 = tmp7 - z3;

                data[off + 40] = z13 + z2;
                data[off + 24] = z13 - z2;
                data[off + 8] = z11 + z4;
                data[off + 56] = z11 - z4;
                off++;
            }

            for (let i = 0; i < 64; i++) {
                const v = data[i] * scale[i];
                r[i] = v > 0 ? ((v + 0.5) | 0) : ((v - 0.5) | 0);
            }
            return r;
        }

        captureBlocks(imgData, mode) {
            const w = imgData.width, h = imgData.height, d = imgData.data;
            const sm = JpegCORE.Constants.SAMPLE_MODES[mode] || JpegCORE.Constants.SAMPLE_MODES['420'];
            const mcuW = sm.hMax * 8, mcuH = sm.vMax * 8;
            const cols = Math.ceil(w / mcuW), rows = Math.ceil(h / mcuH);
            const allBlocks = [];
            const blkData = new Float32Array(64);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const xBase = c * mcuW, yBase = r * mcuH;
                    for (let b = 0; b < sm.blocks.length; b++) {
                        const bDef = sm.blocks[b], isChroma = bDef.t === 'C', scale = isChroma ? this.aanScaleC : this.aanScaleY;
                        const stepX = isChroma ? sm.hMax : 1, stepY = isChroma ? sm.vMax : 1;
                        const bOffX = bDef.dx * 8, bOffY = bDef.dy * 8;

                        for (let by = 0; by < 8; by++) {
                            for (let bx = 0; bx < 8; bx++) {
                                if (!isChroma) {
                                    let px = xBase + bOffX + bx, py = yBase + bOffY + by;
                                    if (px >= w) px = w - 1; if (py >= h) py = h - 1;
                                    const idx = (py * w + px) * 4;
                                    const R = d[idx], G = d[idx + 1], B = d[idx + 2];
                                    blkData[by * 8 + bx] = 0.299 * R + 0.587 * G + 0.114 * B - 128;
                                } else if (sm.hMax === 2 && sm.vMax === 2) {
                                    let px0 = xBase + bx * 2, px1 = px0 + 1, py0 = yBase + by * 2, py1 = py0 + 1;
                                    if (px0 >= w) px0 = w - 1; if (px1 >= w) px1 = w - 1;
                                    if (py0 >= h) py0 = h - 1; if (py1 >= h) py1 = h - 1;
                                    const idx00 = (py0 * w + px0) * 4, idx01 = (py0 * w + px1) * 4;
                                    const idx10 = (py1 * w + px0) * 4, idx11 = (py1 * w + px1) * 4;
                                    const R = (d[idx00] + d[idx01] + d[idx10] + d[idx11]) * 0.25;
                                    const G = (d[idx00 + 1] + d[idx01 + 1] + d[idx10 + 1] + d[idx11 + 1]) * 0.25;
                                    const B = (d[idx00 + 2] + d[idx01 + 2] + d[idx10 + 2] + d[idx11 + 2]) * 0.25;
                                    blkData[by * 8 + bx] = (bDef.c === 0) ? -0.1687 * R - 0.3313 * G + 0.5 * B : 0.5 * R - 0.4187 * G - 0.0813 * B;
                                } else {
                                    let sumR = 0, sumG = 0, sumB = 0, count = 0;
                                    for (let sy = 0; sy < stepY; sy++) {
                                        for (let sx = 0; sx < stepX; sx++) {
                                            let px = xBase + bOffX * stepX + bx * stepX + sx, py = yBase + bOffY * stepY + by * stepY + sy;
                                            if (px >= w) px = w - 1; if (py >= h) py = h - 1;
                                            const idx = (py * w + px) * 4; sumR += d[idx]; sumG += d[idx + 1]; sumB += d[idx + 2]; count++;
                                        }
                                    }
                                    const R = sumR / count, G = sumG / count, B = sumB / count;
                                    blkData[by * 8 + bx] = (bDef.c === 0) ? -0.1687 * R - 0.3313 * G + 0.5 * B : 0.5 * R - 0.4187 * G - 0.0813 * B;
                                }
                            }
                        }
                        allBlocks.push({ data: this.fdctAan(blkData, scale), type: bDef.t, comp: isChroma ? (bDef.c === 0 ? 1 : 2) : 0 });
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

        encodeImageData(imgData, mode) {
            this.buf = []; this.byte = 0; this.cnt = 0;
            const M = JpegCORE.Constants.MARKERS;
            const wr = (v) => { this.buf.push((v >> 8) & 0xFF, v & 0xFF); }, wb = (v) => { this.buf.push(v); };
            const w = imgData.width, h = imgData.height, d = imgData.data;
            const sm = JpegCORE.Constants.SAMPLE_MODES[mode] || JpegCORE.Constants.SAMPLE_MODES['420'];
            const isGray = mode === 'GRAY', numComps = isGray ? 1 : 3;

            const toZigZag = (n) => {
                const zz = new Uint8Array(64);
                const Z = JpegCORE.Constants.ZIG_ZAG_ARR;
                for (let i = 0; i < 64; i++) zz[i] = n[Z[i]];
                return zz;
            };

            wr(0xFF00 | M.SOI);
            wr(0xFF00 | M.APP0); wr(16); [0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0].forEach(wb);
            wr(0xFF00 | M.DQT); wr(132);
            wb(0); toZigZag(this.tY).forEach(v => wb(v));
            wb(1); toZigZag(this.tC).forEach(v => wb(v));
            wr(0xFF00 | M.SOF0); wr(8 + 3 * numComps); wb(8); wr(h); wr(w); wb(numComps); wb(1); wb((sm.hMax << 4) | sm.vMax); wb(0);
            if (!isGray) { wb(2); wb(0x11); wb(1); wb(3); wb(0x11); wb(1); }
            let len = 6, ht = this.curHT; [ht.dclv, ht.aclv, ht.dccv, ht.accv].forEach(v => len += 16 + v.length);
            wr(0xFF00 | M.DHT); wr(len); wb(0x00); ht.dcln.forEach(wb); ht.dclv.forEach(wb); wb(0x10); ht.acln.forEach(wb); ht.aclv.forEach(wb); wb(0x01); ht.dccn.forEach(wb); ht.dccv.forEach(wb); wb(0x11); ht.accn.forEach(wb); ht.accv.forEach(wb);
            wr(0xFF00 | M.SOS); wr(6 + 2 * numComps); wb(numComps); wb(1); wb(0); if (!isGray) { wb(2); wb(0x11); wb(3); wb(0x11); } wb(0); wb(63); wb(0);

            const mcuW = sm.hMax * 8, mcuH = sm.vMax * 8;
            const cols = Math.ceil(w / mcuW), rows = Math.ceil(h / mcuH);
            const blkData = new Float32Array(64);
            const coeffData = new Int32Array(64);
            const pd = [0, 0, 0];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const xBase = c * mcuW, yBase = r * mcuH;
                    for (let b = 0; b < sm.blocks.length; b++) {
                        const bDef = sm.blocks[b], isChroma = bDef.t === 'C', scale = isChroma ? this.aanScaleC : this.aanScaleY;
                        const stepX = isChroma ? sm.hMax : 1, stepY = isChroma ? sm.vMax : 1;
                        const bOffX = bDef.dx * 8, bOffY = bDef.dy * 8;

                        for (let by = 0; by < 8; by++) {
                            for (let bx = 0; bx < 8; bx++) {
                                if (!isChroma) {
                                    let px = xBase + bOffX + bx, py = yBase + bOffY + by;
                                    if (px >= w) px = w - 1; if (py >= h) py = h - 1;
                                    const idx = (py * w + px) * 4;
                                    const R = d[idx], G = d[idx + 1], B = d[idx + 2];
                                    blkData[by * 8 + bx] = 0.299 * R + 0.587 * G + 0.114 * B - 128;
                                } else if (sm.hMax === 2 && sm.vMax === 2) {
                                    let px0 = xBase + bx * 2, px1 = px0 + 1, py0 = yBase + by * 2, py1 = py0 + 1;
                                    if (px0 >= w) px0 = w - 1; if (px1 >= w) px1 = w - 1;
                                    if (py0 >= h) py0 = h - 1; if (py1 >= h) py1 = h - 1;
                                    const idx00 = (py0 * w + px0) * 4, idx01 = (py0 * w + px1) * 4;
                                    const idx10 = (py1 * w + px0) * 4, idx11 = (py1 * w + px1) * 4;
                                    const R = (d[idx00] + d[idx01] + d[idx10] + d[idx11]) * 0.25;
                                    const G = (d[idx00 + 1] + d[idx01 + 1] + d[idx10 + 1] + d[idx11 + 1]) * 0.25;
                                    const B = (d[idx00 + 2] + d[idx01 + 2] + d[idx10 + 2] + d[idx11 + 2]) * 0.25;
                                    blkData[by * 8 + bx] = (bDef.c === 0) ? -0.1687 * R - 0.3313 * G + 0.5 * B : 0.5 * R - 0.4187 * G - 0.0813 * B;
                                } else {
                                    let sumR = 0, sumG = 0, sumB = 0, count = 0;
                                    for (let sy = 0; sy < stepY; sy++) {
                                        for (let sx = 0; sx < stepX; sx++) {
                                            let px = xBase + bOffX * stepX + bx * stepX + sx, py = yBase + bOffY * stepY + by * stepY + sy;
                                            if (px >= w) px = w - 1; if (py >= h) py = h - 1;
                                            const idx = (py * w + px) * 4; sumR += d[idx]; sumG += d[idx + 1]; sumB += d[idx + 2]; count++;
                                        }
                                    }
                                    const R = sumR / count, G = sumG / count, B = sumB / count;
                                    blkData[by * 8 + bx] = (bDef.c === 0) ? -0.1687 * R - 0.3313 * G + 0.5 * B : 0.5 * R - 0.4187 * G - 0.0813 * B;
                                }
                            }
                        }

                        const comp = isChroma ? (bDef.c === 0 ? 1 : 2) : 0;
                        pd[comp] = this.ems(this.fdctAan(blkData, scale, coeffData), pd[comp], comp === 0 ? this.hLD : this.hCD, comp === 0 ? this.hLA : this.hCA);
                    }
                }
            }

            if (this.cnt > 0) this.wbt(0x7F >>> (8 - this.cnt), 8 - this.cnt);
            wr(0xFF00 | M.EOI);
            return new Uint8Array(this.buf);
        }

        ems(b, p, hd, ha) {
            const ZZ = JpegCORE.Constants.ZIG_ZAG_ARR;
            const magLen = this.magLen, magBits = this.magBits, magOffset = this.magOffset;
            let d = b[0] - p, pos = magOffset + d, l = magLen[pos];
            this.wh(hd, l); if (l > 0) this.wbt(magBits[pos], l);
            let z = 0;
            for (let i = 1; i < 64; i++) {
                let k = ZZ[i];
                if (b[k] === 0) z++;
                else { while (z >= 16) { this.wh(ha, 0xF0); z -= 16; } let v = b[k], p2 = magOffset + v, s = magLen[p2]; this.wh(ha, (z << 4) | s); this.wbt(magBits[p2], s); z = 0; }
            }
            if (z > 0) this.wh(ha, 0); return b[0];
        }
        wh(t, v) { const e = t[v]; this.wbt(e.c, e.l); }
        wbt(b, l) {
            this.byte = (this.byte << l) | (b & ((1 << l) - 1));
            this.cnt += l;
            if (this.cnt >= 8) {
                let out = (this.byte >> (this.cnt - 8)) & 0xFF;
                this.buf.push(out);
                if (out === 0xFF) this.buf.push(0);
                this.cnt -= 8;
                if (this.cnt >= 8) {
                    out = (this.byte >> (this.cnt - 8)) & 0xFF;
                    this.buf.push(out);
                    if (out === 0xFF) this.buf.push(0);
                    this.cnt -= 8;
                }
            }
            this.byte &= (1 << this.cnt) - 1;
        }
    },

