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

