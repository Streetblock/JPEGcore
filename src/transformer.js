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
                        srcR = rows - 1 - c;
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

