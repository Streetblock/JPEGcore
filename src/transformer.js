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

        flipH: function(captured, options = {}) {
            return this._runGridTransform(captured, 'FLIP_H', options);
        },

        flipV: function(captured, options = {}) {
            return this._runGridTransform(captured, 'FLIP_V', options);
        },

        rotate90: function(captured, options = {}) {
            return this._runGridTransform(captured, 'ROT_90', options);
        },

        _transposeQuantTables: function(tables) {
            const transposedTables = {};
            const seen = new Map();
            for (const [id, table] of Object.entries(tables)) {
                if (!seen.has(table)) {
                    const transposed = new table.constructor(64);
                    for (let y = 0; y < 8; y++) {
                        for (let x = 0; x < 8; x++) transposed[y * 8 + x] = table[x * 8 + y];
                    }
                    seen.set(table, transposed);
                }
                transposedTables[id] = seen.get(table);
            }
            return transposedTables;
        },

        _replaceBlocks: function(captured, blocks) {
            if (captured.coeffBuffer) {
                const buffer = new Int32Array(blocks.length * 64);
                blocks.forEach((block, i) => buffer.set(block.data, i * 64));
                captured.coeffBuffer = buffer;
                captured.blockList = blocks.map(({ type, comp }) => ({ type, comp }));
                if (captured.blocks) captured.blocks = blocks;
            } else {
                captured.blocks = blocks;
            }
        },

        _runPixelTransform: function(captured, mode) {
            const source = JpegCORE.Decoder.render(captured);
            const w = mode === 'ROT_90' ? source.height : source.width;
            const h = mode === 'ROT_90' ? source.width : source.height;
            const data = new Uint8ClampedArray(w * h * 4);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const sx = mode === 'FLIP_H' ? source.width - 1 - x : mode === 'ROT_90' ? y : x;
                    const sy = mode === 'FLIP_V' ? source.height - 1 - y : mode === 'ROT_90' ? source.height - 1 - x : y;
                    const srcOffset = (sy * source.width + sx) * 4;
                    const dstOffset = (y * w + x) * 4;
                    for (let c = 0; c < 4; c++) data[dstOffset + c] = source.data[srcOffset + c];
                }
            }
            // Re-encode at full chroma resolution to preserve rotated chroma
            // geometry and avoid resampling colors across a shifted MCU edge.
            const outputMode = captured.mode === 'GRAY' ? 'GRAY' : '444';
            let tables = captured.quantTables || {};
            if (mode === 'ROT_90') tables = this._transposeQuantTables(tables);
            const maps = captured.compMap || [];
            const qY = tables[(maps.find(c => c.type === 0) || { tq: 0 }).tq];
            const qC = tables[(maps.find(c => c.type === 1) || { tq: 1 }).tq];
            const encoder = new JpegCORE.Encoder(90, qY, qC || qY);
            const replacement = encoder.captureBlocks({ data, width: w, height: h }, outputMode);
            this._replaceBlocks(captured, replacement.blocks);
            captured.w = w; captured.h = h; captured.mode = outputMode;
            captured.quantTables = replacement.quantTables;
            captured.compMap = replacement.compMap;
            delete captured.preDecodedData;
            captured.transformWasReencoded = true;
            return captured;
        },

        _runGridTransform: function(captured, mode, options = {}) {
            const sm = JpegCORE.Constants.SAMPLE_MODES[captured.mode];
            const needsReencode = !!captured.preDecodedData || (sm && (
                (mode === 'FLIP_H' && captured.w % (sm.hMax * 8) !== 0) ||
                (mode === 'FLIP_V' && captured.h % (sm.vMax * 8) !== 0) ||
                (mode === 'ROT_90' && (captured.h % (sm.vMax * 8) !== 0 || sm.hMax !== sm.vMax))
            ));
            if (needsReencode) {
                if (options.losslessOnly) throw new Error("This JPEG transform requires re-encoding; losslessOnly was requested");
                return this._runPixelTransform(captured, mode);
            }
            if (!sm) throw new Error("Unsupported JPEG sampling mode for transform");
            const sourceBlocks = captured.blocks || (captured.blockList && captured.coeffBuffer &&
                captured.blockList.map((block, i) => ({ ...block, data: captured.coeffBuffer.subarray(i * 64, (i + 1) * 64) })));
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
                return sourceBlocks.slice(idx, idx + blocksPerMCU);
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
                        srcR = rows - 1 - c;
                        transformOp = 2;
                    }

                    const srcMCU = getMCU(srcC, srcR);
                    const newMCU = new Array(blocksPerMCU);

                    for (let b = 0; b < blocksPerMCU; b++) {
                        let targetB = b;
                        const bDef = sm.blocks[b];

                        if (bDef.t === 'Y') {
                            const dx = mode === 'FLIP_H' ? sm.hMax - 1 - bDef.dx
                                : mode === 'ROT_90' ? sm.vMax - 1 - bDef.dy : bDef.dx;
                            const dy = mode === 'FLIP_V' ? sm.vMax - 1 - bDef.dy
                                : mode === 'ROT_90' ? bDef.dx : bDef.dy;
                            targetB = sm.blocks.findIndex(def => def.t === 'Y' && def.dx === dx && def.dy === dy);
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

            if (mode === 'ROT_90' && captured.quantTables) {
                captured.quantTables = this._transposeQuantTables(captured.quantTables);
            }
            this._replaceBlocks(captured, newBlocks);
            captured.w = newW;
            captured.h = newH;
            captured.transformWasReencoded = false;
            return captured;
        }
    },

