/**
* JpegCORE - A pure JavaScript JPEG Encoder/Decoder/Transformer Library
* Copyright (c) David Block
* Extended Version 1.9.0 Refactor with Utils
* * CORES:
* - Decoder:  1.8.3 JIT Turbo Added Loeffler Integer IDCT (Standard), Naive IDCT (Legacy/Reference),
* Fixed IDCT amplitude/saturation bug (v1.7.5), Robust Mode(v1.7.8)
* - Encoder: ZigZag order fix for saving (v1.7.4), enfoceNewQuality (1.7.7)
* * * Features  1.7.6:
* - NEW: Quantization Crush (Deep Fry effect)
* - NEW: Chromatic Aberration (Channel shifting)
* - Standard: Encode, Decode (Scale-on-Load), Transform, Analysis
*/

const JpegCORE = {
    Config: {
        nativeProgressiveDecode: false,
        strictArithmeticDecode: true,
        arithmeticTraceLimit: 128
    },
    // --- 1. CONSTANTS ---
    Constants: {
      MARKERS: {
          SOI: 0xD8, EOI: 0xD9, SOF0: 0xC0, SOF2: 0xC2, SOF9: 0xC9, DHT: 0xC4,
          DAC: 0xCC,
          DQT: 0xDB, DRI: 0xDD, SOS: 0xDA, APP0: 0xE0, APP1: 0xE1, COM: 0xFE, RST0: 0xD0, RST7: 0xD7
      },
      ZIG_ZAG: new Int32Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]),

      ZIG_ZAG_ARR: [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63],
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
        },

        MAX_DIMENSION: 10000
    },

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
                let infoStr = "", detectedSamp = '420', detectedProgressive = false, detectedArithmetic = false;
                let restartIntervalMCUs = 0;
                const arithmeticDcTables = {};
                const arithmeticAcTables = {};
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
                            if (type === M.SOF0 || type === M.SOF2 || type === M.SOF9) {
                                detectedProgressive = (type === M.SOF2);
                                detectedArithmetic = (type === M.SOF9);
                                const ySamp = d[pos + 11];
                                const numComps = d[pos + 9];
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
                            } else if (type === M.DRI) {
                                restartIntervalMCUs = ((d[pos + 4] << 8) | d[pos + 5]) >>> 0;
                            } else if (type === M.DAC) {
                                let subPos = pos + 4, end = pos + 2 + len;
                                while (subPos + 1 < end) {
                                    const tcTb = d[subPos++];
                                    const cond = d[subPos++];
                                    const tc = (tcTb >> 4) & 0x0F;
                                    const tb = tcTb & 0x0F;
                                    if (tb > 3) continue;
                                    if (tc === 0) {
                                        const U = (cond >> 4) & 0x0F;
                                        const L = cond & 0x0F;
                                        if (L <= U) {
                                            arithmeticDcTables[tb] = { L, U };
                                        }
                                    } else if (tc === 1) {
                                        const Kx = cond & 0x3F;
                                        if (Kx >= 1 && Kx <= 63) {
                                            arithmeticAcTables[tb] = { Kx };
                                        }
                                    }
                                }
                                detectedArithmetic = true;
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
                    detectedProgressive: detectedProgressive,
                    detectedArithmetic: detectedArithmetic,
                    restartIntervalMCUs: restartIntervalMCUs,
                    arithmeticDcTables: arithmeticDcTables,
                    arithmeticAcTables: arithmeticAcTables,
                    detectedHuffman: foundCustom ? extractedHuff : null,
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
                const ArithmeticDecoder = utils.ArithmeticDecoder;

                // STATUS CODES
                const STAT_MARKER = -1;
                const STAT_RST = -2;
                const arithmeticTables = { dc: {}, ac: {} };

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
                let isArithmetic = false;
                let restartIntervalMCUs = 0;
                let tables = { 0: { 0: makeTree(H.DC_L_NR, H.DC_L_VAL), 1: makeTree(H.DC_C_NR, H.DC_C_VAL) }, 1: { 0: makeTree(H.AC_L_NR, H.AC_L_VAL), 1: makeTree(H.AC_C_NR, H.AC_C_VAL) } };
                const quantTables = {};

                if (d[0] === 0xFF && d[1] === M.SOI) pos = 2;
                const parseDacSegment = (start, end) => {
                    let subPos = start;
                    while (subPos + 1 < end) {
                        const tableClassAndId = d[subPos++];
                        const conditioning = d[subPos++];
                        const tc = (tableClassAndId >> 4) & 0x0F;
                        const tb = tableClassAndId & 0x0F;
                        if (tb > 3) continue;

                        if (tc === 0) {
                            const U = (conditioning >> 4) & 0x0F;
                            const L = conditioning & 0x0F;
                            if (L <= U) {
                                arithmeticTables.dc[tb] = { L, U };
                            }
                        } else if (tc === 1) {
                            const Kx = conditioning & 0x3F;
                            if (Kx >= 1 && Kx <= 63) {
                                arithmeticTables.ac[tb] = { Kx };
                            }
                        }
                    }
                };
                const buildArithmeticScanState = (compsForScan) => {
                    const dcStatsByTable = {};
                    const acStatsByTable = {};
                    const compStateByType = {};
                    const dcConditioningByTable = {};
                    const acConditioningByTable = {};
                    const dcMagnitudeContextByType = {};
                    const acBandContextByType = {};

                    for (const c of compsForScan) {
                        if (!dcStatsByTable[c.dcTbl]) dcStatsByTable[c.dcTbl] = new Uint8Array(64);
                        if (!acStatsByTable[c.acTbl]) acStatsByTable[c.acTbl] = new Uint8Array(256);
                        if (!dcConditioningByTable[c.dcTbl]) {
                            dcConditioningByTable[c.dcTbl] = arithmeticTables.dc[c.dcTbl] || { L: 0, U: 1 };
                        }
                        if (!acConditioningByTable[c.acTbl]) {
                            acConditioningByTable[c.acTbl] = arithmeticTables.ac[c.acTbl] || { Kx: 5 };
                        }
                        if (!compStateByType[c.type]) {
                            compStateByType[c.type] = { lastDcDiff: 0 };
                        }
                        if (!dcMagnitudeContextByType[c.type]) {
                            // JPEG arithmetic DC commonly uses 5 context slots per component.
                            dcMagnitudeContextByType[c.type] = new Uint8Array(5);
                        }
                        if (!acBandContextByType[c.type]) {
                            // Packed AC context bank layout:
                            // 0..62   : significance slots by zig-zag band
                            // 63      : EOB decision
                            // 64..79  : run-growth slots
                            // 269..272: run class routing slots
                            // 80..142 : sign slots by band
                            // 143..205: magnitude-growth slots by band
                            // 206..268: magnitude-bit slots by band
                            acBandContextByType[c.type] = new Uint8Array(273);
                        }
                    }

                    return {
                        dcStatsByTable,
                        acStatsByTable,
                        compStateByType,
                        dcConditioningByTable,
                        acConditioningByTable,
                        dcMagnitudeContextByType,
                        acBandContextByType
                    };
                };

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

                    if (marker === M.SOF0 || marker === M.SOF2 || marker === M.SOF9) {
                        isProgressive = (marker === M.SOF2);
                        isArithmetic = (marker === M.SOF9);
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
                    } else if (marker === M.DRI) {
                        if (pos + 5 < d.length) {
                            restartIntervalMCUs = ((d[pos + 3] << 8) | d[pos + 4]) >>> 0;
                        }
                    } else if (marker === M.DAC) {
                        parseDacSegment(pos + 3, segmentEnd);
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

                            if (isArithmetic) {
                                const dcCount = Object.keys(arithmeticTables.dc).length;
                                const acCount = Object.keys(arithmeticTables.ac).length;
                                const isSequential = (Ss === 0 && Se === 63 && Ah === 0 && Al === 0);
                                if (!isSequential) {
                                    throw new Error(`Arithmetic JPEG scan mode not supported yet (Ss=${Ss}, Se=${Se}, Ah=${Ah}, Al=${Al}; DAC DC=${dcCount}, AC=${acCount}).`);
                                }

                                for (const c of comps) {
                                    if (!arithmeticTables.dc[c.dcTbl]) {
                                        throw new Error(`Arithmetic JPEG missing DC conditioning table ${c.dcTbl} for component type ${c.type}.`);
                                    }
                                    if (!arithmeticTables.ac[c.acTbl]) {
                                        throw new Error(`Arithmetic JPEG missing AC conditioning table ${c.acTbl} for component type ${c.type}.`);
                                    }
                                }
                                const arithmeticState = buildArithmeticScanState(comps);
                                const dcStateTables = Object.keys(arithmeticState.dcStatsByTable).length;
                                const acStateTables = Object.keys(arithmeticState.acStatsByTable).length;
                                const dcCompContexts = Object.keys(arithmeticState.dcMagnitudeContextByType).length;
                                const acCompContexts = Object.keys(arithmeticState.acBandContextByType).length;
                                const traceLimit = (JpegCORE.Config.arithmeticTraceLimit | 0) > 0 ? (JpegCORE.Config.arithmeticTraceLimit | 0) : 0;
                                const arithmeticTrace = [];
                                const pushTrace = (entry) => {
                                    if (traceLimit <= 0) return;
                                    if (arithmeticTrace.length >= traceLimit) return;
                                    arithmeticTrace.push(entry);
                                };
                                const formatTraceLine = (e, i) => {
                                    const k = (typeof e.k === "number") ? ` k=${e.k}` : "";
                                    const run = (typeof e.run === "number") ? ` run=${e.run}` : "";
                                    const tbl = (typeof e.dcTbl === "number") ? ` dcTbl=${e.dcTbl}` : ((typeof e.acTbl === "number") ? ` acTbl=${e.acTbl}` : "");
                                    return `#${i + 1} ${e.phase} comp=${e.comp}${tbl}${k}${run} ctx=(${e.idx},${e.mps}) bit=${e.bit} A=${e.a} C=${e.c}`;
                                };
                                const compactTrace = (limit = 6) => arithmeticTrace.slice(0, limit).map(formatTraceLine).join(" | ");
                                reader.pos = sosEnd;
                                const arithmeticDecoder = new ArithmeticDecoder(reader);
                                const initStatus = arithmeticDecoder.initialize();
                                if (initStatus === STAT_MARKER || initStatus === STAT_RST || initStatus === null) {
                                    throw new Error(`Arithmetic JPEG init failed (status=${initStatus}).`);
                                }
                                if (!arithmeticDecoder.initialized) {
                                    throw new Error("Arithmetic JPEG init failed (decoder not initialized).");
                                }
                                const sanityCtx = arithmeticDecoder.createContextState(0, 0);
                                const sanityBit = arithmeticDecoder.decodeBit(sanityCtx);
                                if (sanityBit === STAT_MARKER || sanityBit === STAT_RST || sanityBit === null) {
                                    throw new Error(`Arithmetic JPEG context read failed (status=${sanityBit}).`);
                                }
                                const readPackedCtx = (bank, slot, defaultMps = 0) => {
                                    const packed = bank[slot] | 0;
                                    const mps = (packed >> 7) & 1;
                                    const idx = packed & 0x7f;
                                    return arithmeticDecoder.createContextState(mps || defaultMps, idx);
                                };
                                const writePackedCtx = (bank, slot, state) => {
                                    bank[slot] = (((state.mps & 1) << 7) | (state.idx & 0x7f)) & 0xff;
                                };

                                const decodeArithmeticDcDiff = (c) => {
                                    const compCtx = arithmeticState.dcMagnitudeContextByType[c.type];
                                    const compState = arithmeticState.compStateByType[c.type];
                                    const cond = arithmeticState.dcConditioningByTable[c.dcTbl];
                                    const prevMag = Math.abs(compState.lastDcDiff | 0);
                                    const low = Math.max(0, cond.L | 0);
                                    const high = Math.max(low, cond.U | 0);
                                    const magClassPrev = prevMag === 0 ? 0 : (prevMag <= low ? 1 : (prevMag <= high ? 2 : 3));

                                    // Context 0: zero/non-zero decision
                                    const zeroCtxIdx = (compCtx[0] + magClassPrev) & 0x3f;
                                    const zeroCtx = readPackedCtx(compCtx, 0, 0);
                                    zeroCtx.idx = zeroCtxIdx;
                                    const nonZero = arithmeticDecoder.decodeBit(zeroCtx);
                                    writePackedCtx(compCtx, 0, zeroCtx);
                                    pushTrace({ phase: "dc_zero", comp: c.type, dcTbl: c.dcTbl, idx: zeroCtx.idx, mps: zeroCtx.mps, bit: nonZero, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                    if (nonZero === STAT_MARKER || nonZero === STAT_RST || nonZero === null) return nonZero;
                                    if (nonZero === 0) {
                                        compState.lastDcDiff = 0;
                                        return 0;
                                    }

                                    // Context 1: sign
                                    const signCtx = readPackedCtx(compCtx, 1, (compState.lastDcDiff < 0) ? 1 : 0);
                                    const signBit = arithmeticDecoder.decodeBit(signCtx);
                                    writePackedCtx(compCtx, 1, signCtx);
                                    pushTrace({ phase: "dc_sign", comp: c.type, dcTbl: c.dcTbl, idx: signCtx.idx, mps: signCtx.mps, bit: signBit, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                    if (signBit === STAT_MARKER || signBit === STAT_RST || signBit === null) return signBit;

                                    // Context 2: magnitude class growth, clipped by U.
                                    let magClass = 0;
                                    while (magClass < cond.U) {
                                        const classCtx = readPackedCtx(compCtx, 2, 0);
                                        const inc = arithmeticDecoder.decodeBit(classCtx);
                                        writePackedCtx(compCtx, 2, classCtx);
                                        pushTrace({ phase: "dc_mag_inc", comp: c.type, dcTbl: c.dcTbl, idx: classCtx.idx, mps: classCtx.mps, bit: inc, k: magClass, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                        if (inc === STAT_MARKER || inc === STAT_RST || inc === null) return inc;
                                        if (inc === 0) break;
                                        magClass++;
                                    }

                                    // Lower-bound from L plus class expansion.
                                    let magnitude = 1 + Math.max(0, cond.L) + magClass;
                                    let extraBits = magClass;
                                    while (extraBits-- > 0) {
                                        const magBitState = readPackedCtx(compCtx, 3, 0);
                                        const b = arithmeticDecoder.decodeBit(magBitState);
                                        writePackedCtx(compCtx, 3, magBitState);
                                        pushTrace({ phase: "dc_mag_bit", comp: c.type, dcTbl: c.dcTbl, idx: magBitState.idx, mps: magBitState.mps, bit: b, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                        if (b === STAT_MARKER || b === STAT_RST || b === null) return b;
                                        magnitude = (magnitude << 1) | b;
                                    }

                                    const diff = signBit ? -magnitude : magnitude;
                                    compState.lastDcDiff = diff;
                                    return diff;
                                };

                                const decodeArithmeticAcBlock = (blockOffset, c) => {
                                    const acCtx = arithmeticState.acBandContextByType[c.type];
                                    const acCond = arithmeticState.acConditioningByTable[c.acTbl];
                                    const kx = acCond && acCond.Kx ? acCond.Kx : 5;
                                    const sigSlot = (kk) => (kk - 1);
                                    const signSlot = (kk) => (80 + (kk - 1));
                                    const magIncSlot = (kk) => (143 + (kk - 1));
                                    const magBitSlot = (kk) => (206 + (kk - 1));
                                    let k = 1;
                                    while (k < 64) {
                                        // EOB decision for remaining band.
                                        const eobState = readPackedCtx(acCtx, 63, 0);
                                        const eob = arithmeticDecoder.decodeBit(eobState);
                                        writePackedCtx(acCtx, 63, eobState);
                                        pushTrace({ phase: "ac_eob", comp: c.type, acTbl: c.acTbl, k, idx: eobState.idx, mps: eobState.mps, bit: eob, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                        if (eob === STAT_MARKER || eob === STAT_RST || eob === null) return eob;
                                        if (eob === 1) {
                                            break;
                                        }

                                        // Zero-run classification + growth before next non-zero coefficient.
                                        // Stage 1: short vs long run class.
                                        const runClassState = readPackedCtx(acCtx, 269, 0);
                                        const longRunClass = arithmeticDecoder.decodeBit(runClassState);
                                        writePackedCtx(acCtx, 269, runClassState);
                                        pushTrace({ phase: "ac_run_class", comp: c.type, acTbl: c.acTbl, k, idx: runClassState.idx, mps: runClassState.mps, bit: longRunClass, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                        if (longRunClass === STAT_MARKER || longRunClass === STAT_RST || longRunClass === null) return longRunClass;

                                        let run = 0;
                                        const runCap = longRunClass ? 63 : 7;
                                        const runClassSlotBase = longRunClass ? 271 : 270;
                                        while (k + run < 64) {
                                            const runSlot = 64 + Math.min(run, 15);
                                            const runState = readPackedCtx(acCtx, runSlot, 0);
                                            const keepZero = arithmeticDecoder.decodeBit(runState);
                                            writePackedCtx(acCtx, runSlot, runState);
                                            pushTrace({ phase: "ac_run", comp: c.type, acTbl: c.acTbl, k, run, idx: runState.idx, mps: runState.mps, bit: keepZero, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                            if (keepZero === STAT_MARKER || keepZero === STAT_RST || keepZero === null) return keepZero;
                                            if (keepZero === 0) break;

                                            // Class-local growth confirmation: adds an extra decision
                                            // so short/long branches can diverge statistically.
                                            const classGrowState = readPackedCtx(acCtx, runClassSlotBase + Math.min(run, 1), 0);
                                            const classGrow = arithmeticDecoder.decodeBit(classGrowState);
                                            writePackedCtx(acCtx, runClassSlotBase + Math.min(run, 1), classGrowState);
                                            pushTrace({ phase: "ac_run_class_grow", comp: c.type, acTbl: c.acTbl, k, run, idx: classGrowState.idx, mps: classGrowState.mps, bit: classGrow, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                            if (classGrow === STAT_MARKER || classGrow === STAT_RST || classGrow === null) return classGrow;
                                            if (classGrow === 0) break;

                                            run++;
                                            if (run >= runCap) break;
                                        }
                                        k += run;
                                        if (k >= 64) break;

                                        // Significance decision for the selected band position.
                                        const sigState = readPackedCtx(acCtx, sigSlot(k), 0);
                                        const significant = arithmeticDecoder.decodeBit(sigState);
                                        writePackedCtx(acCtx, sigSlot(k), sigState);
                                        pushTrace({ phase: "ac_sig", comp: c.type, acTbl: c.acTbl, k, idx: sigState.idx, mps: sigState.mps, bit: significant, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                        if (significant === STAT_MARKER || significant === STAT_RST || significant === null) return significant;
                                        if (significant === 0) {
                                            k++;
                                            continue;
                                        }

                                        // Sign decision (predict from current sign when available; default MPS=0).
                                        const signState = readPackedCtx(acCtx, signSlot(k), 0);
                                        const signBit = arithmeticDecoder.decodeBit(signState);
                                        writePackedCtx(acCtx, signSlot(k), signState);
                                        pushTrace({ phase: "ac_sign", comp: c.type, acTbl: c.acTbl, k, idx: signState.idx, mps: signState.mps, bit: signBit, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                        if (signBit === STAT_MARKER || signBit === STAT_RST || signBit === null) return signBit;

                                        // Magnitude class, bounded by DAC Kx.
                                        let magClass = 0;
                                        while (magClass < kx) {
                                            const magState = readPackedCtx(acCtx, magIncSlot(k), 0);
                                            const inc = arithmeticDecoder.decodeBit(magState);
                                            writePackedCtx(acCtx, magIncSlot(k), magState);
                                            pushTrace({ phase: "ac_mag_inc", comp: c.type, acTbl: c.acTbl, k, idx: magState.idx, mps: magState.mps, bit: inc, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                            if (inc === STAT_MARKER || inc === STAT_RST || inc === null) return inc;
                                            if (inc === 0) break;
                                            magClass++;
                                        }

                                        let magnitude = 1 + magClass;
                                        let extra = magClass;
                                        while (extra-- > 0) {
                                            const magBitState = readPackedCtx(acCtx, magBitSlot(k), 0);
                                            const b = arithmeticDecoder.decodeBit(magBitState);
                                            writePackedCtx(acCtx, magBitSlot(k), magBitState);
                                            pushTrace({ phase: "ac_mag_bit", comp: c.type, acTbl: c.acTbl, k, idx: magBitState.idx, mps: magBitState.mps, bit: b, a: arithmeticDecoder.a, c: arithmeticDecoder.c });
                                            if (b === STAT_MARKER || b === STAT_RST || b === null) return b;
                                            magnitude = (magnitude << 1) | b;
                                        }

                                        const value = signBit ? -magnitude : magnitude;
                                        coeff[blockOffset + zig[k]] = value;
                                        k++;
                                    }
                                    return 0;
                                };

                                // Arithmetic milestone: consume DC and an initial AC pass with context state.
                                let dcBlocksDecoded = 0;
                                let acBlocksDecoded = 0;
                                let arithmeticStopStatus = null;
                                let rstEvents = 0;
                                let mcusSinceRestart = 0;
                                const resetArithmeticRestartState = () => {
                                    predDC[0] = 0; predDC[1] = 0; predDC[2] = 0;
                                    for (const compType of Object.keys(arithmeticState.compStateByType)) {
                                        arithmeticState.compStateByType[compType].lastDcDiff = 0;
                                    }
                                    for (const tbl of Object.keys(arithmeticState.dcStatsByTable)) {
                                        arithmeticState.dcStatsByTable[tbl].fill(0);
                                    }
                                    for (const tbl of Object.keys(arithmeticState.acStatsByTable)) {
                                        arithmeticState.acStatsByTable[tbl].fill(0);
                                    }
                                    for (const compType of Object.keys(arithmeticState.dcMagnitudeContextByType)) {
                                        arithmeticState.dcMagnitudeContextByType[compType].fill(0);
                                    }
                                    for (const compType of Object.keys(arithmeticState.acBandContextByType)) {
                                        arithmeticState.acBandContextByType[compType].fill(0);
                                    }
                                };
                                outerArithmeticLoop:
                                for (let m = 0; m < cols * rows; m++) {
                                    let mcuDone = false;
                                    for (const c of comps) {
                                        let blockIndex = -1;
                                        for (let bIdx = 0; bIdx < blocksPerMCU; bIdx++) {
                                            const blk = blockList[m * blocksPerMCU + bIdx];
                                            if (blk && blk.comp === c.type) { blockIndex = bIdx; break; }
                                        }
                                        if (blockIndex < 0) continue;
                                        const blockOffset = (m * blocksPerMCU + blockIndex) * 64;
                                        if (blockOffset + 64 > coeff.length) break outerArithmeticLoop;

                                        const diff = decodeArithmeticDcDiff(c);
                                        if (diff === STAT_RST) {
                                            rstEvents++;
                                            resetArithmeticRestartState();
                                            continue;
                                        }
                                        if (diff === STAT_MARKER || diff === null) {
                                            arithmeticStopStatus = diff;
                                            break outerArithmeticLoop;
                                        }
                                        predDC[c.type] += diff;
                                        coeff[blockOffset] = predDC[c.type];
                                        dcBlocksDecoded++;

                                        const acStatus = decodeArithmeticAcBlock(blockOffset, c);
                                        if (acStatus === STAT_RST) {
                                            rstEvents++;
                                            resetArithmeticRestartState();
                                            continue;
                                        }
                                        if (acStatus === STAT_MARKER || acStatus === null) {
                                            arithmeticStopStatus = acStatus;
                                            break outerArithmeticLoop;
                                        }
                                        acBlocksDecoded++;
                                        mcuDone = true;
                                    }
                                    if (mcuDone && restartIntervalMCUs > 0) {
                                        mcusSinceRestart++;
                                        if (mcusSinceRestart >= restartIntervalMCUs) {
                                            resetArithmeticRestartState();
                                            mcusSinceRestart = 0;
                                        }
                                    }
                                }

                                if (arithmeticStopStatus !== null && arithmeticStopStatus !== STAT_MARKER) {
                                    throw new Error(`Arithmetic JPEG staged decode interrupted (status=${arithmeticStopStatus}, dcBlocksDecoded=${dcBlocksDecoded}, acBlocksDecoded=${acBlocksDecoded}, rstEvents=${rstEvents}).`);
                                }
                                if (JpegCORE.Config.strictArithmeticDecode) {
                                    const last = arithmeticTrace.length ? arithmeticTrace[arithmeticTrace.length - 1] : null;
                                    const where = last
                                        ? ` step=${arithmeticTrace.length} phase=${last.phase} comp=${last.comp}${(typeof last.k === "number") ? ` k=${last.k}` : ""}${(typeof last.run === "number") ? ` run=${last.run}` : ""}`
                                        : ` step=0`;
                                    const preview = arithmeticTrace.length ? ` trace=[${compactTrace(6)}]` : "";
                                    throw new Error(`Arithmetic JPEG strict mode: staged model not yet T.81 parity complete (${where}, dcBlocksDecoded=${dcBlocksDecoded}, acBlocksDecoded=${acBlocksDecoded}, rstEvents=${rstEvents}).${preview}`);
                                }
                                // Arithmetic staged path completed for this scan.
                                // Keep marker parser aligned for potential following segments/scans.
                                pos = reader.pos;
                                if (pos > 0 && pos < d.length && d[pos] !== 0xFF && d[pos - 1] === 0xFF) {
                                    pos--;
                                }
                                continue;
                            }

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
                        } else if (marker === M.DAC) {
                            const len = (d[pos + 1] << 8) | d[pos + 2];
                            if (pos + 1 + len > d.length) break;
                            parseDacSegment(pos + 3, pos + 1 + len);
                            pos += 1 + len;
                        } else if (marker === M.DRI) {
                            const len = (d[pos + 1] << 8) | d[pos + 2];
                            if (pos + 1 + len > d.length) break;
                            if (len >= 4 && pos + 4 < d.length) {
                                restartIntervalMCUs = ((d[pos + 3] << 8) | d[pos + 4]) >>> 0;
                            }
                            pos += 1 + len;
                        } else if (marker === M.EOI) { break; }
                        else { const len = (d[pos + 1] << 8) | d[pos + 2]; pos += 1 + len; }
                    }
                } catch (e) {
                    if (e && typeof e.message === "string" && e.message.includes("Arithmetic JPEG")) {
                        throw e;
                    }
                    console.warn("Robust Decode Warning:", e);
                }

                return { coeffBuffer, blockList, w, h, mode: finalMode, quantTables, compMap: compMapList, restartIntervalMCUs, decodeBackend: 'internal' };

            } catch (globalErr) {
                if (globalErr && typeof globalErr.message === "string" && globalErr.message.includes("Arithmetic JPEG")) {
                    throw globalErr;
                }
                console.error("Critical Decoder Failure:", globalErr);
                return { blocks: [], w: 0, h: 0, mode: '420', quantTables: {}, compMap: [] };
            }
        },//*/

        // Wrapper für Abwärtskompatibilität zu v1.8.0
        extractBlocks: async function(file) {
            // 1. Die neue, schnelle Funktion aufrufen
            const optimized = await this.extractBlocksStruct(file);

            if (optimized.preDecodedData && !optimized.blockList) {
                return {
                    blocks: [],
                    preDecodedData: optimized.preDecodedData,
                    w: optimized.w,
                    h: optimized.h,
                    mode: optimized.mode,
                    quantTables: optimized.quantTables || {},
                    compMap: optimized.compMap || [],
                    isProgressiveFallback: optimized.isProgressiveFallback,
                    decodeBackend: optimized.decodeBackend
                };
            }

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

            if (mode === 'GRAY') {
                const qt = compQT[0] || new Uint8Array(JpegCORE.Constants.QUANT_L);
                for (let r = 0; r < rows; r++) {
                    const rowBase = r * mcuH * w * 4;

                    for (let c = 0; c < cols; c++) {
                        if (bIdx >= blockList.length) break;
                        const meta = blockList[bIdx];
                        const blockQt = compQT[meta.comp] || qt;
                        if (isFlatBuffer) {
                            idct.transform(buffer, bIdx * 64, blockQt, blockSize, mcuPix, 0);
                        } else {
                            idct.transform(meta.data, 0, blockQt, blockSize, mcuPix, 0);
                        }
                        bIdx++;

                        const ox = c * mcuW;
                        const oy = r * mcuH;
                        const maxY = Math.min(mcuH, h - oy);
                        const maxX = Math.min(mcuW, w - ox);

                        for (let y = 0; y < maxY; y++) {
                            let ptr = rowBase + (y * w * 4) + (ox * 4);
                            const srcRow = y * blockSize;
                            for (let x = 0; x < maxX; x++) {
                                const Y = mcuPix[srcRow + x];
                                finalData[ptr++] = Y;
                                finalData[ptr++] = Y;
                                finalData[ptr++] = Y;
                                finalData[ptr++] = 255;
                            }
                        }
                    }
                }

                return new ImageData(finalData, w, h);
            }

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
                        srcR = cols - 1 - c;
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

    JpegJsCompat: {
        // jpeg-js compatible async decode wrapper.
        // Accepts Uint8Array/ArrayBuffer/Buffer/Blob and returns { data, width, height }.
        decode: async function(input, opts = {}) {
            const useTArray = opts.useTArray !== false;
            const formatAsRGBA = opts.formatAsRGBA !== false;

            let blob;
            if (typeof Blob !== "undefined" && input instanceof Blob) {
                blob = input;
            } else if (input instanceof ArrayBuffer) {
                blob = new Blob([new Uint8Array(input)], { type: "image/jpeg" });
            } else if (input && typeof input.length === "number") {
                blob = new Blob([new Uint8Array(input)], { type: "image/jpeg" });
            } else {
                throw new Error("JpegJsCompat.decode: unsupported input type");
            }

            const decoded = await JpegCORE.Decoder.extractBlocksStruct(blob);
            if (!decoded.preDecodedData && (!decoded.w || !decoded.h || (!decoded.coeffBuffer && !decoded.blockList && !decoded.blocks))) {
                throw new Error("JpegJsCompat.decode: unsupported or invalid JPEG");
            }
            const imgData = JpegCORE.Decoder.render(decoded, 1.0);

            let data = imgData.data;
            if (!formatAsRGBA) {
                const rgb = new Uint8Array(imgData.width * imgData.height * 3);
                let di = 0;
                for (let i = 0; i < data.length; i += 4) {
                    rgb[di++] = data[i];
                    rgb[di++] = data[i + 1];
                    rgb[di++] = data[i + 2];
                }
                data = rgb;
            } else if (!useTArray) {
                data = Array.from(data);
            }

            return {
                data,
                width: imgData.width,
                height: imgData.height
            };
        },

        // jpeg-js compatible encode wrapper.
        // encode({ data, width, height }, quality) -> { data, width, height }
        encode: function(rawImageData, quality = 50, opts = {}) {
            if (!rawImageData || !rawImageData.data || !rawImageData.width || !rawImageData.height) {
                throw new Error("JpegJsCompat.encode: rawImageData must include data, width, and height");
            }

            const width = rawImageData.width | 0;
            const height = rawImageData.height | 0;
            const src = rawImageData.data;
            const mode = opts.mode || "420";
            const q = Math.max(1, Math.min(100, quality | 0));

            const expectedRGBA = width * height * 4;
            const expectedRGB = width * height * 3;
            let rgba;

            if (src.length === expectedRGBA) {
                rgba = (src instanceof Uint8ClampedArray) ? src : new Uint8ClampedArray(src);
            } else if (src.length === expectedRGB) {
                rgba = new Uint8ClampedArray(expectedRGBA);
                let si = 0;
                for (let di = 0; di < expectedRGBA; di += 4) {
                    rgba[di] = src[si++];
                    rgba[di + 1] = src[si++];
                    rgba[di + 2] = src[si++];
                    rgba[di + 3] = 255;
                }
            } else {
                throw new Error("JpegJsCompat.encode: data length must be width*height*3 or width*height*4");
            }

            const imgData = new ImageData(rgba, width, height);
            const encoder = new JpegCORE.Encoder(q);
            const bytes = encoder.encodeImageData(imgData, mode);

            return {
                data: bytes,
                width,
                height
            };
        }
    }

};



