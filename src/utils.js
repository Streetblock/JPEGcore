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
                { qe: 0x5a1d, nmps: 1, nlps: 1, switchMps: 1 },
                { qe: 0x2586, nmps: 2, nlps: 6, switchMps: 0 },
                { qe: 0x1114, nmps: 3, nlps: 9, switchMps: 0 },
                { qe: 0x080b, nmps: 4, nlps: 12, switchMps: 0 },
                { qe: 0x03d8, nmps: 5, nlps: 29, switchMps: 0 },
                { qe: 0x01da, nmps: 38, nlps: 33, switchMps: 0 },
                { qe: 0x5a1d, nmps: 7, nlps: 6, switchMps: 1 },
                { qe: 0x2586, nmps: 8, nlps: 14, switchMps: 0 },
                { qe: 0x14cd, nmps: 9, nlps: 14, switchMps: 0 },
                { qe: 0x080b, nmps: 10, nlps: 14, switchMps: 0 },
                { qe: 0x03d8, nmps: 11, nlps: 17, switchMps: 0 },
                { qe: 0x01da, nmps: 12, nlps: 18, switchMps: 0 },
                { qe: 0x00e5, nmps: 13, nlps: 20, switchMps: 0 },
                { qe: 0x006f, nmps: 29, nlps: 21, switchMps: 0 },
                { qe: 0x0036, nmps: 15, nlps: 14, switchMps: 0 },
                { qe: 0x001a, nmps: 16, nlps: 14, switchMps: 0 },
                { qe: 0x000d, nmps: 17, nlps: 15, switchMps: 0 },
                { qe: 0x0006, nmps: 18, nlps: 16, switchMps: 0 },
                { qe: 0x0003, nmps: 19, nlps: 17, switchMps: 0 },
                { qe: 0x0001, nmps: 20, nlps: 18, switchMps: 0 },
                { qe: 0x5a1d, nmps: 21, nlps: 19, switchMps: 1 },
                { qe: 0x2586, nmps: 22, nlps: 19, switchMps: 0 },
                { qe: 0x1114, nmps: 23, nlps: 20, switchMps: 0 },
                { qe: 0x080b, nmps: 24, nlps: 21, switchMps: 0 },
                { qe: 0x03d8, nmps: 25, nlps: 22, switchMps: 0 },
                { qe: 0x01da, nmps: 26, nlps: 23, switchMps: 0 },
                { qe: 0x00e5, nmps: 27, nlps: 24, switchMps: 0 },
                { qe: 0x006f, nmps: 28, nlps: 25, switchMps: 0 },
                { qe: 0x0036, nmps: 29, nlps: 26, switchMps: 0 },
                { qe: 0x001a, nmps: 30, nlps: 27, switchMps: 0 },
                { qe: 0x000d, nmps: 31, nlps: 28, switchMps: 0 },
                { qe: 0x0006, nmps: 32, nlps: 29, switchMps: 0 },
                { qe: 0x0003, nmps: 33, nlps: 30, switchMps: 0 },
                { qe: 0x0001, nmps: 34, nlps: 31, switchMps: 0 },
                { qe: 0x5a1d, nmps: 35, nlps: 32, switchMps: 1 },
                { qe: 0x2586, nmps: 36, nlps: 33, switchMps: 0 },
                { qe: 0x1114, nmps: 37, nlps: 34, switchMps: 0 },
                { qe: 0x080b, nmps: 38, nlps: 35, switchMps: 0 },
                { qe: 0x03d8, nmps: 39, nlps: 36, switchMps: 0 },
                { qe: 0x01da, nmps: 40, nlps: 37, switchMps: 0 },
                { qe: 0x00e5, nmps: 41, nlps: 38, switchMps: 0 },
                { qe: 0x006f, nmps: 42, nlps: 39, switchMps: 0 },
                { qe: 0x0036, nmps: 43, nlps: 40, switchMps: 0 },
                { qe: 0x001a, nmps: 44, nlps: 41, switchMps: 0 },
                { qe: 0x000d, nmps: 45, nlps: 42, switchMps: 0 },
                { qe: 0x0006, nmps: 45, nlps: 43, switchMps: 0 },
                { qe: 0x0003, nmps: 46, nlps: 44, switchMps: 0 },
                { qe: 0x0001, nmps: 46, nlps: 45, switchMps: 0 }
            ];

            constructor(bitReader) {
                this.reader = bitReader;
                this.c = 0;
                this.a = 0x10000;
                this.ct = 0;
                this.initialized = false;
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

            _readByte() {
                let b = this.reader.nextBit();
                if (b === null || b < 0) return b;
                let v = b;
                for (let i = 0; i < 7; i++) {
                    b = this.reader.nextBit();
                    if (b === null || b < 0) return b;
                    v = (v << 1) | b;
                }
                return v;
            }

            initialize() {
                const b1 = this._readByte();
                if (b1 === null || b1 < 0) return b1;
                const b2 = this._readByte();
                if (b2 === null || b2 < 0) return b2;
                this.c = (b1 << 8) | b2;
                this.a = 0x10000;
                this.ct = 0;
                this.initialized = true;
                return 0;
            }

            _renorm() {
                while (this.a < 0x8000) {
                    const inBit = this.reader.nextBit();
                    if (inBit === null || inBit < 0) return inBit;
                    this.a <<= 1;
                    this.c = ((this.c << 1) | inBit) & 0x1ffff;
                }
                return 0;
            }

            // Temporary placeholder until full QM-state machine is wired.
            decodeBypassBit() {
                return this.reader.nextBit();
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
