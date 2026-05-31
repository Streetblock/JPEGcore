    Utils: {

        // --- 1. HUFFMAN TREE GENERATOR ---
        // Konvertiert die JPEG-Standard-Tabellenform in einen navigierbaren binären Baum.
        makeHuffmanTree: function(L, V) {
            const root = [];
            let c = 0, p = 0;
            for (let i = 1; i <= 16; i++) {
                for (let j = 0; j < L[i - 1]; j++) {
                    let curr = root;
                    for (let x = i - 1; x >= 0; x--) {
                        const bit = (c >> x) & 1;
                        if (x === 0) {
                            if (p < V.length) curr[bit] = V[p++];
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
        },

        // --- 2. BIT READER KLASSE ---
        /**
         * BitReader - Spezialisierte Klasse zum bitweisen Lesen des JPEG-Datenstroms.
         * * Diese Klasse ist entscheidend für die Vermeidung des "Grau-Bild-Bugs".
         * Er entsteht, wenn der Decoder über Marker (wie 0xFF 0xD9) hinausliest
         * und Müll-Daten als Bildinformationen interpretiert.
         */
        BitReader: class {
            constructor(data, startPos= 0) {
                this.d = data;           // Das Uint8Array des gesamten JPEG-Files
                this._pos = startPos;     // Aktuelle Byte-Position im Array
                this.bitBuffer = 0;      // Zwischenspeicher für das aktuelle Byte
                this.bitCount = 0;       // Anzahl der noch verfügbaren Bits im Buffer

                // Status-Codes zur Signalisierung von Stream-Ereignissen
                this.STAT_MARKER = -1;   // Ein unerwarteter Marker unterbricht den Datenstrom
                this.STAT_RST = -2;      // Ein Restart-Marker wurde gefunden (für Fehlerkorrektur)
            }

            // Getter: Liefert die aktuelle Byte-Position
            get pos() {
                return this._pos;
            }

            // Setter: Setzt die Position UND leert automatisch den Puffer
            set pos(newPos) {
                this._pos = newPos;
                this.bitBuffer = 0; // WICHTIG: Puffer leeren
                this.bitCount = 0;  // WICHTIG: Bit-Zähler zurücksetzen
            }

            /**
             * Holt das nächste Bit. Behandelt das JPEG "Byte-Stuffing".
             * JPEG wandelt 0xFF in den Bilddaten zu 0xFF 0x00 um, damit es nicht mit Markern verwechselt wird.
             */
            nextBit() {
                if (this.bitCount === 0) {
                    if (this._pos >= this.d.length) return null; // Stream-Ende erreicht

                    let b = this.d[this._pos++];

                    // JPEG-Marker-Logik: 0xFF leitet immer etwas Besonderes ein
                    if (b === 0xFF) {
                        // Optional fill bytes (0xFF) may precede a marker at scan boundaries.
                        // Consume them so marker handling remains aligned.
                        while (this._pos < this.d.length && this.d[this._pos] === 0xFF) {
                            this._pos++;
                        }
                        if (this._pos >= this.d.length) return null;
                        let next = this.d[this._pos];

                        if (next === 0) {
                            // 0xFF 0x00: Ein echtes 0xFF-Datenbyte, das "gestopft" wurde.
                            this._pos++; // Überspringe die 0x00
                        } else if (next >= 0xD0 && next <= 0xD7) {
                            // Restart-Marker (RST0-RST7): Erlaubt Dekodier-Resets.
                            this._pos++;
                            return this.STAT_RST; // Signalisiere Reset
                        } else if (next === 0xD9) {
                            // EOI (End of Image): Bild ist hier zu Ende.
                            return null;
                        } else {
                            // Jeder andere Marker (z.B. neuer Scan oder Fehler)
                            return this.STAT_MARKER;
                        }
                    }
                    this.bitBuffer = b;
                    this.bitCount = 8;
                }

                // Extrahiere das höchstwertige Bit (MSB) und schiebe den Puffer weiter
                const bit = (this.bitBuffer >> (this.bitCount - 1)) & 1;
                this.bitCount--;
                return bit;
            }

            /**
             * Liest eine Sequenz von Bits und gibt sie als Ganzzahl zurück.
             * WICHTIG: Reicht Status-Codes (-1, -2) sofort nach oben durch.
             */
            readRaw(length) {
                let v = 0;
                for (let i = 0; i < length; i++) {
                    const b = this.nextBit();
                    // Wenn ein Status-Code oder null kommt, brechen wir sofort ab
                    if (b === null || b < 0) return b;
                    v = (v << 1) | b;
                }
                return v;
            }

            /**
             * Dekodiert JPEG-spezifische vorzeichenbehaftete Differenzwerte.
             * JPEG nutzt eine spezielle Kodierung: Wenn das erste Bit 0 ist, ist die Zahl negativ.
             */
            readSigned(length) {
                if (length === 0) return 0;
                let v = this.readRaw(length);

                // Status-Check: Verhindert, dass -1 (Marker) als Bilddatum interpretiert wird
                if (v === null || v < 0) return null;

                // Umrechnung nach JPEG-Standard (Successive Approximation/Baseline)
                // Formel: $$v < 2^{length-1} \implies v + (-1 \ll length) + 1$$
                if (v < (1 << (length - 1))) {
                    return v + (-1 << length) + 1;
                }
                return v;
            }

            /**
             * Navigiert durch den Huffman-Baum basierend auf dem Bitstream.
             * Jetzt mit Sicherheits-Stopp bei korrupten Bäumen.
             */
            readHuffman(node) {
                let curr = node;
                let safety = 0;

                while (safety < 32) { // Sicherheitslimit hinzugefügt
                    safety++;
                    const b = this.nextBit();

                    // Status-Codes (-1, -2) oder Stream-Ende (null) sofort zurückgeben
                    if (b === null || b < 0) return b;

                    curr = curr[b];

                    if (typeof curr === 'number') return curr; // Symbol gefunden
                    if (curr === undefined) return null; // Pfad im Baum existiert nicht
                }

                return null; // Sicherheits-Stopp: Code zu lang oder Baum zirkulär
            }

            /**
             * Leert den Bit-Puffer. Notwendig nach Markern oder Resets.
             */
            reset() {
                this.bitCount = 0;
                this.bitBuffer = 0;
            }
        },

        // --- 3. ARITHMETIC DECODER (JPEG T.81 groundwork) ---
        // This is the shared stateful arithmetic core used by SOF9 decoding paths.
        // The full coefficient decode wiring is implemented incrementally in decoder.js.
        ArithmeticDecoder: class {
            static QM_TABLE = [
                { qe: 0x5a1d, nlps: 1, nmps: 1, switchMps: 1 },
                { qe: 0x2586, nlps: 14, nmps: 2, switchMps: 0 },
                { qe: 0x1114, nlps: 16, nmps: 3, switchMps: 0 },
                { qe: 0x080b, nlps: 18, nmps: 4, switchMps: 0 },
                { qe: 0x03d8, nlps: 20, nmps: 5, switchMps: 0 },
                { qe: 0x01da, nlps: 23, nmps: 6, switchMps: 0 },
                { qe: 0x00e5, nlps: 25, nmps: 7, switchMps: 0 },
                { qe: 0x006f, nlps: 28, nmps: 8, switchMps: 0 },
                { qe: 0x0036, nlps: 30, nmps: 9, switchMps: 0 },
                { qe: 0x001a, nlps: 33, nmps: 10, switchMps: 0 },
                { qe: 0x000d, nlps: 35, nmps: 11, switchMps: 0 },
                { qe: 0x0006, nlps: 9, nmps: 12, switchMps: 0 },
                { qe: 0x0003, nlps: 10, nmps: 13, switchMps: 0 },
                { qe: 0x0001, nlps: 12, nmps: 13, switchMps: 0 },
                { qe: 0x5a7f, nlps: 15, nmps: 15, switchMps: 1 },
                { qe: 0x3f25, nlps: 36, nmps: 16, switchMps: 0 },
                { qe: 0x2cf2, nlps: 38, nmps: 17, switchMps: 0 },
                { qe: 0x207c, nlps: 39, nmps: 18, switchMps: 0 },
                { qe: 0x17b9, nlps: 40, nmps: 19, switchMps: 0 },
                { qe: 0x1182, nlps: 42, nmps: 20, switchMps: 0 },
                { qe: 0x0cef, nlps: 43, nmps: 21, switchMps: 0 },
                { qe: 0x09a1, nlps: 45, nmps: 22, switchMps: 0 },
                { qe: 0x072f, nlps: 46, nmps: 23, switchMps: 0 },
                { qe: 0x055c, nlps: 48, nmps: 24, switchMps: 0 },
                { qe: 0x0406, nlps: 49, nmps: 25, switchMps: 0 },
                { qe: 0x0303, nlps: 51, nmps: 26, switchMps: 0 },
                { qe: 0x0240, nlps: 52, nmps: 27, switchMps: 0 },
                { qe: 0x01b1, nlps: 54, nmps: 28, switchMps: 0 },
                { qe: 0x0144, nlps: 56, nmps: 29, switchMps: 0 },
                { qe: 0x00f5, nlps: 57, nmps: 30, switchMps: 0 },
                { qe: 0x00b7, nlps: 59, nmps: 31, switchMps: 0 },
                { qe: 0x008a, nlps: 60, nmps: 32, switchMps: 0 },
                { qe: 0x0068, nlps: 62, nmps: 33, switchMps: 0 },
                { qe: 0x004e, nlps: 63, nmps: 34, switchMps: 0 },
                { qe: 0x003b, nlps: 32, nmps: 35, switchMps: 0 },
                { qe: 0x002c, nlps: 33, nmps: 9, switchMps: 0 },
                { qe: 0x5ae1, nlps: 37, nmps: 37, switchMps: 1 },
                { qe: 0x484c, nlps: 64, nmps: 38, switchMps: 0 },
                { qe: 0x3a0d, nlps: 65, nmps: 39, switchMps: 0 },
                { qe: 0x2ef1, nlps: 67, nmps: 40, switchMps: 0 },
                { qe: 0x261f, nlps: 68, nmps: 41, switchMps: 0 },
                { qe: 0x1f33, nlps: 69, nmps: 42, switchMps: 0 },
                { qe: 0x19a8, nlps: 70, nmps: 43, switchMps: 0 },
                { qe: 0x1518, nlps: 72, nmps: 44, switchMps: 0 },
                { qe: 0x1177, nlps: 73, nmps: 45, switchMps: 0 },
                { qe: 0x0e74, nlps: 74, nmps: 46, switchMps: 0 },
                { qe: 0x0bfb, nlps: 75, nmps: 47, switchMps: 0 },
                { qe: 0x09f8, nlps: 77, nmps: 48, switchMps: 0 },
                { qe: 0x0861, nlps: 78, nmps: 49, switchMps: 0 },
                { qe: 0x0706, nlps: 79, nmps: 50, switchMps: 0 },
                { qe: 0x05cd, nlps: 48, nmps: 51, switchMps: 0 },
                { qe: 0x04de, nlps: 50, nmps: 52, switchMps: 0 },
                { qe: 0x040f, nlps: 50, nmps: 53, switchMps: 0 },
                { qe: 0x0363, nlps: 51, nmps: 54, switchMps: 0 },
                { qe: 0x02d4, nlps: 52, nmps: 55, switchMps: 0 },
                { qe: 0x025c, nlps: 53, nmps: 56, switchMps: 0 },
                { qe: 0x01f8, nlps: 54, nmps: 57, switchMps: 0 },
                { qe: 0x01a4, nlps: 55, nmps: 58, switchMps: 0 },
                { qe: 0x0160, nlps: 56, nmps: 59, switchMps: 0 },
                { qe: 0x0125, nlps: 57, nmps: 60, switchMps: 0 },
                { qe: 0x00f6, nlps: 58, nmps: 61, switchMps: 0 },
                { qe: 0x00cb, nlps: 59, nmps: 62, switchMps: 0 },
                { qe: 0x00ab, nlps: 61, nmps: 63, switchMps: 0 },
                { qe: 0x008f, nlps: 61, nmps: 32, switchMps: 0 },
                { qe: 0x5b12, nlps: 65, nmps: 65, switchMps: 1 },
                { qe: 0x4d04, nlps: 80, nmps: 66, switchMps: 0 },
                { qe: 0x412c, nlps: 81, nmps: 67, switchMps: 0 },
                { qe: 0x37d8, nlps: 82, nmps: 68, switchMps: 0 },
                { qe: 0x2fe8, nlps: 83, nmps: 69, switchMps: 0 },
                { qe: 0x293c, nlps: 84, nmps: 70, switchMps: 0 },
                { qe: 0x2379, nlps: 86, nmps: 71, switchMps: 0 },
                { qe: 0x1edf, nlps: 87, nmps: 72, switchMps: 0 },
                { qe: 0x1aa9, nlps: 87, nmps: 73, switchMps: 0 },
                { qe: 0x174e, nlps: 72, nmps: 74, switchMps: 0 },
                { qe: 0x1424, nlps: 72, nmps: 75, switchMps: 0 },
                { qe: 0x119c, nlps: 74, nmps: 76, switchMps: 0 },
                { qe: 0x0f6b, nlps: 74, nmps: 77, switchMps: 0 },
                { qe: 0x0d51, nlps: 75, nmps: 78, switchMps: 0 },
                { qe: 0x0bb6, nlps: 77, nmps: 79, switchMps: 0 },
                { qe: 0x0a40, nlps: 77, nmps: 48, switchMps: 0 },
                { qe: 0x5832, nlps: 80, nmps: 81, switchMps: 1 },
                { qe: 0x4d1c, nlps: 88, nmps: 82, switchMps: 0 },
                { qe: 0x438e, nlps: 89, nmps: 83, switchMps: 0 },
                { qe: 0x3bdd, nlps: 90, nmps: 84, switchMps: 0 },
                { qe: 0x34ee, nlps: 91, nmps: 85, switchMps: 0 },
                { qe: 0x2eae, nlps: 92, nmps: 86, switchMps: 0 },
                { qe: 0x299a, nlps: 93, nmps: 87, switchMps: 0 },
                { qe: 0x2516, nlps: 86, nmps: 71, switchMps: 0 },
                { qe: 0x5570, nlps: 88, nmps: 89, switchMps: 1 },
                { qe: 0x4ca9, nlps: 95, nmps: 90, switchMps: 0 },
                { qe: 0x44d9, nlps: 96, nmps: 91, switchMps: 0 },
                { qe: 0x3e22, nlps: 97, nmps: 92, switchMps: 0 },
                { qe: 0x3824, nlps: 99, nmps: 93, switchMps: 0 },
                { qe: 0x32b4, nlps: 99, nmps: 94, switchMps: 0 },
                { qe: 0x2e17, nlps: 93, nmps: 86, switchMps: 0 },
                { qe: 0x56a8, nlps: 95, nmps: 96, switchMps: 1 },
                { qe: 0x4f46, nlps: 101, nmps: 97, switchMps: 0 },
                { qe: 0x47e5, nlps: 102, nmps: 98, switchMps: 0 },
                { qe: 0x41cf, nlps: 103, nmps: 99, switchMps: 0 },
                { qe: 0x3c3d, nlps: 104, nmps: 100, switchMps: 0 },
                { qe: 0x375e, nlps: 99, nmps: 93, switchMps: 0 },
                { qe: 0x5231, nlps: 105, nmps: 102, switchMps: 0 },
                { qe: 0x4c0f, nlps: 106, nmps: 103, switchMps: 0 },
                { qe: 0x4639, nlps: 107, nmps: 104, switchMps: 0 },
                { qe: 0x415e, nlps: 103, nmps: 99, switchMps: 0 },
                { qe: 0x5627, nlps: 105, nmps: 106, switchMps: 1 },
                { qe: 0x50e7, nlps: 108, nmps: 107, switchMps: 0 },
                { qe: 0x4b85, nlps: 109, nmps: 103, switchMps: 0 },
                { qe: 0x5597, nlps: 110, nmps: 109, switchMps: 0 },
                { qe: 0x504f, nlps: 111, nmps: 107, switchMps: 0 },
                { qe: 0x5a10, nlps: 110, nmps: 111, switchMps: 1 },
                { qe: 0x5522, nlps: 112, nmps: 109, switchMps: 0 },
                { qe: 0x59eb, nlps: 112, nmps: 111, switchMps: 1 },
                { qe: 0x5a1d, nlps: 113, nmps: 113, switchMps: 0 }
            ];

            constructor(bitReader) {
                this.reader = bitReader;
                this.c = 0;
                this.a = 0x10000;
                this.ct = 0;
                this.initialized = false;
                this.entropyByte = 0;
                this.entropyBitsLeft = 0;
            }

            createContextState(initialMps = 0, initialIdx = 0) {
                return { mps: initialMps ? 1 : 0, idx: initialIdx | 0 };
            }

            getQeEntry(index) {
                const table = this.constructor.QM_TABLE;
                if (index < 0) return table[0];
                if (index >= table.length) return table[table.length - 1];
                return table[index];
            }

            _byteIn() {
                const d = this.reader.d;
                if (this.reader.pos >= d.length) return null;
                let b = d[this.reader.pos++];

                if (b !== 0xff) return b;

                // Skip fill bytes.
                while (this.reader.pos < d.length && d[this.reader.pos] === 0xff) {
                    this.reader.pos++;
                }
                if (this.reader.pos >= d.length) return null;

                const next = d[this.reader.pos];
                if (next === 0x00) {
                    this.reader.pos++;
                    return 0xff;
                }
                if (next >= 0xd0 && next <= 0xd7) {
                    this.reader.pos++;
                    return this.reader.STAT_RST;
                }
                if (next === 0xd9) {
                    return null;
                }
                return this.reader.STAT_MARKER;
            }

            _nextEntropyBit() {
                if (this.entropyBitsLeft <= 0) {
                    const b = this._byteIn();
                    if (b === null || b < 0) return b;
                    this.entropyByte = b;
                    this.entropyBitsLeft = 8;
                }
                const out = (this.entropyByte >> (this.entropyBitsLeft - 1)) & 1;
                this.entropyBitsLeft--;
                return out;
            }

            initialize() {
                this.reader.reset();
                this.entropyBitsLeft = 0;
                const b1 = this._byteIn();
                if (b1 === null || b1 < 0) return b1;
                const b2 = this._byteIn();
                if (b2 === null || b2 < 0) return b2;
                this.c = (b1 << 8) | b2;
                this.a = 0x10000;
                this.ct = 0;
                this.initialized = true;
                return 0;
            }

            resetForRestart() {
                // Mirror libjpeg-style restart resync for arithmetic coder registers.
                this.c = 0;
                this.a = 0;
                this.ct = -16;
                this.initialized = false;
                this.entropyByte = 0;
                this.entropyBitsLeft = 0;
            }

            consumeRestartMarker() {
                const d = this.reader.d;
                let p = this.reader.pos | 0;
                while (p < d.length && d[p] !== 0xff) p++;
                if (p >= d.length) return false;
                while (p < d.length && d[p] === 0xff) p++;
                if (p >= d.length) return false;
                const code = d[p];
                if (code >= 0xd0 && code <= 0xd7) {
                    this.reader.pos = p + 1;
                    return true;
                }
                return false;
            }

            _renorm() {
                while (this.a < 0x8000) {
                    const inBit = this._nextEntropyBit();
                    if (inBit === null || inBit < 0) return inBit;
                    this.a <<= 1;
                    this.c = ((this.c << 1) | inBit) & 0x1ffff;
                }
                return 0;
            }

            // Temporary placeholder until full QM-state machine is wired.
            decodeBypassBit() {
                return this._nextEntropyBit();
            }

            // API-compatible context decode hook.
            // Stage 2: register-based A/C update + renormalization.
            decodeBit(contextState) {
                if (!contextState) contextState = this.createContextState(0, 0);
                if (!this.initialized) {
                    const st = this.initialize();
                    if (st === null || st < 0) return st;
                }
                const qe = this.getQeEntry(contextState.idx | 0);
                this.a -= qe.qe;

                let decodedBit;
                if ((this.c & 0xffff) < this.a) {
                    decodedBit = contextState.mps;
                    contextState.idx = qe.nmps;
                } else {
                    this.c = (this.c - this.a) & 0x1ffff;
                    this.a = qe.qe;
                    if (qe.switchMps) contextState.mps ^= 1;
                    contextState.idx = qe.nlps;
                    decodedBit = contextState.mps ^ 1;
                }

                const renormStatus = this._renorm();
                if (renormStatus === null || renormStatus < 0) return renormStatus;
                return decodedBit;
            }
        }
    },

    // --- 2. ANALYSIS ---
