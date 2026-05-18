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
        }
    },

    // --- 2. ANALYSIS ---
