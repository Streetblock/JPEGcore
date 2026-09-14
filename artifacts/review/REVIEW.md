# JPEGcore – Code-Review vom 14.09.2026

**Aktualisiert am 15.09.2026 · Stand: `main`, einschließlich der mit diesem Dokument eingecheckten Fixes. Ausgangspunkt der Nachprüfung: `55e64d1`.**

**Status: Alle neun ursprünglichen Befunde und Befunde 10–13 sind behoben. Befund 14 ist noch offen und reproduziert.** Die Behebung bezieht sich auf den Repository-Stand; eine Veröffentlichung der Fixes in der npm-Registry wurde nicht überprüft.

Schwerpunkt: JavaScript-Library in `Repo/src`, ausgeliefertes Bundle, Paket-Einstieg und Tests. `Referenz` und lokale libjpeg-turbo-Werkzeuge dienen als unabhängige Vergleiche. Der experimentelle `rust-port` ist nicht Gegenstand eines vollständigen Reviews. Neue Fixes werden einzeln mit Regressionstests, Build-Ausgabe und aktualisiertem Review-Status eingecheckt.

## Behoben

| ID | Priorität | Befund | Behebung auf `main` | Regressionstest |
| --- | --- | --- | --- | --- |
| 1 | P1 | npm-Paket exportiert die Library nicht | CommonJS-Export; PR #2, `ba4b402` / Merge `438cb3d` | `tests/node-runtime.test.js` |
| 2 | P1 | Chrominanz-Quantisierungstabelle unvollständig | Vollständige 64 Werte; `681992d` | `tests/quantization.test.js` |
| 3 | P1 | Progressive Huffman-Scans enden am ersten Restart-Marker | Explizite Restart-Grenzen und Zustandsreset; `681992d` | `tests/restart.test.js`, 24 unabhängige Fixtures |
| 4 | P2 | Node-Pfade benötigen Browser-ImageData | Umgebungsunabhängige Pixelobjekte; PR #2, `ba4b402` | `tests/node-runtime.test.js` |
| 5 | P2 | Rotation transponiert Quantisierungstabellen nicht | Tabellen mittransponiert; `b7c4659` | `tests/transform.test.js` |
| 6 | P2 | Horizontales Spiegeln von 4:2:2 vertauscht Y-Blöcke nicht | Blockzuordnung anhand der Geometrie; `b7c4659` | `tests/transform.test.js` |
| 7 | P2 | Transformationen verschieben Padding ins sichtbare Bild | Ganzes Bild durch Neukodierung erhalten, wenn nötig; `losslessOnly` lehnt diesen Fall ab; `b7c4659` | `tests/transform.test.js` |
| 8 | P2 | Quantisierer laufen bei niedriger Qualität über | Begrenzung auf 1–255 vor Typkonvertierung; `681992d` | `tests/quantization.test.js` |
| 9 | P2 | `forceNewQuality` ersetzt Tabellen ohne Neuquantisierung | Koeffizienten mit alten/neuen Tabellen neu quantisiert; `681992d` | `tests/quantization.test.js`, `tests/save-tables.test.js` |

Weitere inzwischen erledigte Korrekturen:

| Thema | Behebung auf `main` | Regressionstest |
| --- | --- | --- |
| Rendering bei 50 %, 25 % und 12,5 %, einschließlich ungerader Dimensionen | PR #1, `79e08f4`, `6f001c2` | `tests/render.test.js` |
| Komponentenspezifische Quantisierungstabellen beim Speichern, einschließlich separater Cb/Cr-Tabellen und abweichender IDs | `aa69d3b` | `tests/save-tables.test.js` |
| 16-Bit-Quantisierungstabellen beim Lesen/Analysieren | `55e64d1` | `tests/wide-quantization.test.js` |
| Encoder-Dimensionen und Pixelpufferlängen validieren | `55e64d1` | `tests/input-validation.test.js` |
| Verständlicher Fehler statt TypeError bei ungültigen Eingaben im Legacy-Decoder | `55e64d1`; noch keine vollständige Strukturvalidierung, siehe Befund 13 | `tests/input-validation.test.js` |
| Node-Buffer für explizites `useTArray: false` in RGB und RGBA | `55e64d1` | `tests/input-validation.test.js` |

## Nachprüfung – Status der zusätzlichen Befunde

Die Prioritäten sind Review-Einschätzungen. Die Fehlerbeschreibungen dokumentieren den Zustand bei der Nachprüfung von `55e64d1`; der jeweilige Status und Behebungsabsatz beschreiben den aktuellen Stand. Das lokale Skript `more-findings.cjs` diente zur ursprünglichen Reproduktion und setzt lokale libjpeg-turbo-Werkzeuge voraus. Für bereits behobene Befunde gelten die eingecheckten Regressionstests statt dieses historischen Skripts.

### 10. [P1] BEHOBEN – RGB-JPEGs liefern falsche Farben

Stelle: `src/decoder.js`, Komponentenzuordnung und Farbumrechnung.

Ein mit `cjpeg -quality 90 -rgb -sample 1x1` erzeugtes RGB-JPEG wird angenommen, aber wie YCbCr verarbeitet. Beim 17×19-Testbild beträgt der mittlere absolute RGB-Kanalfehler gegenüber libjpeg-turbo **85,87 auf einer Skala von 0 bis 255**.

Behebung: RGB anhand von Adobe APP14 oder RGB-Komponenten-IDs erkennen und mit `Unsupported JPEG color space` ablehnen; ebenso CMYK/YCCK. Damit entfällt die stille Ausgabe falscher Farben. Die Unterstützung dieser Farbräume bleibt eine mögliche Erweiterung. Regression: `tests/color-space.test.js` mit unabhängiger RGB-Fixture, beiden Erkennungswegen, allen drei Decode-Einstiegen und weiterhin akzeptiertem YCbCr mit APP14.

### 11. [P1] BEHOBEN – 4:4:0-Sampling wird als 4:4:4 behandelt

Stelle: `src/decoder.js`, SOF-Sampling-Erkennung: nur `0x22` und `0x21` werden gesondert erkannt; sonst wird `444` gewählt.

Ein mit `cjpeg -quality 90 -sample 1x2` erzeugtes JPEG mit vertikalem Chroma-Subsampling wird angenommen und falsch decodiert. Beim 17×19-Testbild beträgt der mittlere absolute RGB-Kanalfehler gegenüber libjpeg-turbo **77,60 von 255**.

Behebung: Sampling-Faktoren aller Komponenten vor der Koeffizientenallokation prüfen. Unterstützt bleiben GRAY 1x1 und YCbCr 444/422/420 mit Chroma 1x1; andere Kombinationen werden mit `Unsupported JPEG sampling` abgelehnt. 4:4:0-Unterstützung bleibt eine mögliche Erweiterung. Regression: `tests/sampling-validation.test.js`, unabhängige 4:4:0-Fixture, abweichende Y/Cb/Cr-Faktoren und gültige unterstützte Modi.

### 12. [P2] BEHOBEN – Angeforderte Decode-Ressourcenlimits werden ignoriert

Stelle: `src/jpeg-js-compat.js`, `JpegJsCompat.decode`.

Die Optionen `maxResolutionInMP` und `maxMemoryUsageInMB` werden nicht ausgewertet. Eine gültige 8×8-Fixture wird selbst mit jeweils `0.000001` als Limit decodiert; die jpeg-js-Referenz lehnt sie mit einem Limitfehler ab. Die vorhandene globale Dimensionsgrenze ersetzt diese vom Aufrufer angeforderten Limits nicht.

Behebung: `maxResolutionInMP` wird validiert und vor der großen Koeffizientenallokation sowie vor nativem Decodieren durchgesetzt. Das gilt für den Wrapper und beide Block-Decoder. `maxMemoryUsageInMB` wird ausdrücklich als **nicht implementiert** abgelehnt, bereits vor dem Lesen/Kopieren der Eingabe. Die stille Missachtung beider Optionen ist damit behoben; ein echtes Speicherbudget bleibt eine mögliche Erweiterung. Das Auflösungslimit ersetzt kein Gesamt-Speicherlimit. Regression: `tests/decode-limits.test.js`, einschließlich exakter Pixelgrenze, ungültiger Werte, aller drei APIs und progressivem Decode mit nativer Option.

### 13. [P2] BEHOBEN – JPEG ohne einzigen Scan wird als graues Bild akzeptiert

Stelle: `src/decoder.js`, Header-/Scan-Verarbeitung; Ergebnisprüfung in `src/jpeg-js-compat.js`.

Ein Bytepuffer mit SOI, einem SOF0 für ein 8×8-Graubild und EOI, jedoch ohne SOS und ohne Bilddaten, liefert erfolgreich ein 8×8-Bild mit Pixelwerten `[128, 128, 128, 255]`. Gültige Dimensionen und ein angelegter Koeffizientenpuffer reichen derzeit aus, um die Ergebnisprüfung zu bestehen.

Behebung: Ein SOS-Scan ist vor der Koeffizientenallokation zwingend erforderlich. SOS-Längen und Komponenten-IDs werden validiert; leere Huffman-Scans werden abgelehnt. Alle drei APIs propagieren einen verständlichen `Invalid JPEG scan`-Fehler. Regression: `tests/scan-validation.test.js`, einschließlich fehlendem/abgeschnittenem SOS, leeren Daten, ungültigen Komponenten und einem gültigen grauen Bild. Dies ist keine vollständige strikte Prüfung jedes Entropie-Bits beschädigter Dateien.

### 14. [P2] OFFEN – Flache Blockdaten lassen sich nach Transformation nicht speichern

Stelle: `src/encoder.js`, `save`, Schleife über `captured.blocks.length`.

`Decoder.extractBlocksStruct` → `Transformer.rotate90` → `Encoder.save` scheitert mit `Cannot read properties of undefined (reading 'length')`. Der Transformer unterstützt die flache Repräsentation inzwischen, der Encoder erwartet weiterhin das Legacy-Feld `blocks`. Es handelt sich um eine Lücke zwischen den API-Datenformaten; der Legacy-Pfad mit `extractBlocks` ist davon nicht betroffen.

Nächster Schritt: `save` um die flache Repräsentation erweitern oder eine explizite Konvertierung mit verständlicher Eingabeprüfung bereitstellen. Den gesamten Ablauf als Integrationstest absichern.

## Aktuelle Validierung und Grenzen

- `npm.cmd test` am 15.09.2026 erneut erfolgreich: Build und alle **17 Testsuiten**.
- `node tests/node-runtime.test.js` zusätzlich erfolgreich: Der tatsächliche Paket-Einstieg mit `require("..")` funktioniert ohne Browser-Polyfills.
- `node artifacts/review/more-findings.cjs` reproduzierte Befunde 10–14 auf `55e64d1`. Behobene Fälle werden jetzt durch die bei den Befunden genannten Tests in `npm test` abgesichert. Offene Befunde sind durch grüne bestehende Tests nicht ausgeschlossen.
- Der im selben Skript geprüfte einfache 4:4:4-Fall für `Glitch.swapChannels` zeigte zwischen Vorschau und gespeichertem Bild keine Abweichung. Daraus wird kein weiterer bestätigter Fehler abgeleitet.
- Kein vollständiger Fuzzing-, Performance-, Sicherheits- oder Rust-Audit. Vollständige Pixelkorrektheit aller Arithmetic-SOF9/SOF10-Varianten ist durch die vorhandenen Smoke-Tests nicht belegt.
- Diese Datei wird seit Commit `1752ca3` ausdrücklich von Git versioniert, obwohl das übrige Artefaktverzeichnis ignoriert wird.

## Ursprüngliche Befunde – historisch, alle behoben

Die folgenden Beschreibungen und damaligen Zeilenangaben dokumentieren den Zustand **vor den Fixes**. Für den aktuellen Status gelten die Tabellen und offenen Befunde oben.

### 1. [P1] BEHOBEN – Das npm-Paket exportiert die Library nicht

Stelle: `src/footer.js:1`, Build-Ausgabe in `scripts/build-core.js:64`.

`package.json` verweist mit `main` und `exports` auf `JPEGcore.js`. Das Bundle definiert aber nur ein lokales `const JpegCORE` und setzt kein `module.exports`. Das dokumentierte `require('jpegcore')` liefert daher `{}`; der anschließende Zugriff auf `JpegJsCompat.decode` scheitert. Reproduziert mit `Object.keys(require('./Repo'))`, Ergebnis `[]`.

Behebung: CommonJS-Export im generierten Bundle bereitstellen und den Paket-Einstieg direkt mit `require` testen. Ein erfolgreicher VM-Test prüft diesen Vertrag nicht.

### 2. [P1] BEHOBEN – Die Chrominanz-Quantisierungstabelle ist unvollständig

Stelle: `src/constants.js:12`; Verarbeitung in `src/encoder.js:6–10`.

`QUANT_C` enthält 58 statt 64 Werte. Der Konstruktor schreibt die fehlenden Werte als Null in `tC`, konkret an die natürlichen Positionen 47, 54, 55, 61, 62 und 63. Das tritt bei allen Qualitätswerten von 1 bis 100 auf. Der Encoder schreibt diese Nullen in die DQT und berechnet DCT-Skalierungen durch Division durch Null; betroffene Frequenzen werden dadurch nicht korrekt quantisiert. Der eigene Decoder verdeckt die Nullwerte mit `d[subPos++] || 10`, weshalb die Roundtrip-Tests den Fehler nicht erkennen.

Behebung: vollständige 64-Werte-Tabelle hinterlegen; Tabellenlänge und positive Quantisierungswerte prüfen. Zusätzlich Encoder-Ausgaben mit einem unabhängigen Decoder und einer DQT-Prüfung validieren.

### 3. [P1] BEHOBEN – Progressive Huffman-Scans enden am ersten Restart-Marker

Stelle: `src/decoder.js:1120–1125`, ebenfalls AC-Refinement und die Scan-Schleifen ab Zeile 1254.

`decodeACFirst` behandelt `STAT_RST` wie das Ende des Scans. Die übergeordnete Schleife beendet daraufhin das Decodieren der Komponentenblöcke, anstatt den Restart-Zustand zurückzusetzen und fortzufahren. Die Huffman-Schleifen verwenden das eingelesene Restart-Intervall nicht zur expliziten Block-/MCU-Grenzbehandlung; auch Refinement- und EOB-Zustände benötigen einen Reset.

Reproduktion: dasselbe 64×48-Bild mit lokalem libjpeg-turbo `cjpeg -quality 90 -progressive` und zusätzlich `-restart 1B` erzeugt. Mittlerer absoluter RGB-Fehler gegenüber der vorhandenen jpeg-js-Referenz: ohne Restart **0,000434**, mit Restart **56,823676**. Die Koeffizienten unterscheiden sich, obwohl nur die Restart-Codierung geändert wurde. Baseline mit und ohne Restart liefert im selben Versuch identische Koeffizienten.

Behebung: Restart-Intervalle explizit pro Scan zählen, Padding-Bits verwerfen, Marker konsumieren, Prädiktoren/EOB-/Refinement-Zustände zurücksetzen und den Scan fortsetzen.

### 4. [P2] BEHOBEN – Encode und Decode setzen im Node-Pfad Browser-ImageData voraus

Stellen: `src/jpeg-js-compat.js:78`, `src/decoder.js:1688` sowie weitere Render-Rückgaben.

Unabhängig vom fehlenden CommonJS-Export benötigen beide Wrapper das globale `ImageData`. Es ist in der vorhandenen Node.js-Version 24.14.0 nicht definiert. Nach Zugriff auf das Library-Objekt über eine isolierte Auswertung scheitern sowohl das Decodieren einer vorhandenen gültigen Fixture als auch `encode` mit `ReferenceError: ImageData is not defined`. Alle bestehenden Tests stellen einen ImageData-Ersatz bereit und verdecken diese zusätzliche Integrationslücke.

Behebung: im Node-Pfad ein einfaches Pixelobjekt verwenden bzw. eine interne, umgebungsunabhängige Pixelrepräsentation bereitstellen. Node-Integration ohne Browser-Polyfills prüfen.

### 5. [P2] BEHOBEN – 90°-Rotation transponiert die Quantisierungstabellen nicht

Stelle: `src/transformer.js:92–96`.

Die Rotation transponiert die quantisierten Koeffizienten, lässt aber `captured.quantTables` unverändert. Bei nicht symmetrischen Tabellen werden die verschobenen Frequenzen anschließend mit den falschen Faktoren dequantisiert. Bereits ein einzelner 8×8-Graublock mit `q[1]=2`, `q[8]=20` und einem AC-Koeffizienten reproduziert eine maximale Pixelabweichung von **62** gegenüber der Rotation des ursprünglichen Renderings. Der Fehler betrifft auch vollständig am Blockraster ausgerichtete Bilder.

Behebung: bei einer Rotation jede verwendete Quantisierungstabelle ebenfalls transponieren; gemeinsam verwendete Tabellen nur einmal transponieren.

### 6. [P2] BEHOBEN – Horizontales Spiegeln von 4:2:2 vertauscht die Y-Blöcke nicht

Stelle: `src/transformer.js:77–81`.

Die Umordnung innerhalb einer MCU ist ausschließlich für `420` implementiert. Eine `422`-MCU enthält zwei horizontale Y-Blöcke, die beim horizontalen Spiegeln ihre Plätze tauschen müssen. Ein vollständig ausgerichtetes 16×8-Bild mit Y-DC-Werten `[0,640]` behält nach `flipH` dieselbe Reihenfolge; korrekt wäre `[640,0]`. Es werden nur die Inhalte der einzelnen Blöcke gespiegelt.

Behebung: Blockzuordnung anhand der Sampling-Geometrie berechnen oder mindestens den 422-Fall ergänzen. Die 90°-Rotation benötigt für asymmetrisches Sampling zusätzlich eine passende Ausgabestruktur; bloßes Vertauschen von Breite und Höhe genügt nicht.

### 7. [P2] BEHOBEN – Transformationen verschieben Padding in das sichtbare Bild

Stelle: `src/transformer.js:34–36`, Quell-MCU-Auswahl ab Zeile 58.

Die Funktionen spiegeln/rotieren das auf volle MCUs aufgerundete Raster, behalten aber die ursprüngliche Bildausdehnung bei. Bei nicht ausgerichteten Bildern wandert damit aufgefüllter Rand in den sichtbaren Bereich, während Bildinhalt abgeschnitten wird. Ein 9×8-Graubild mit einer hellen rechten Spalte ergibt nach `flipH` acht helle Spalten statt einer. Der Repro nutzt DC-Blöcke und isoliert diesen Fehler von Quantisierung und Chroma-Sampling.

Behebung: für partielle MCUs eine definierte Strategie umsetzen, etwa korrektes Neucodieren des Randbereichs oder explizites Trimmen/Ablehnen nicht verlustfrei transformierbarer Dimensionen. Die aktuelle Funktion liefert stillschweigend ein falsches Bild.

### 8. [P2] BEHOBEN – Niedrige Qualitätswerte lassen Quantisierer überlaufen

Stelle: `src/encoder.js:17–20`.

Die Qualitätsskalierung begrenzt Werte nicht auf 255, bevor sie in ein `Uint8Array` geschrieben werden. Beispielsweise wird bei Qualität 1 aus dem Luma-DC-Quantisierer 800 durch Überlauf **32** statt des begrenzten Werts **255**. Dadurch ändern sich Quantisierung und Kompressionsverhalten unvorhersehbar; niedrige Qualitätswerte können einzelne Frequenzen feiner statt gröber quantisieren. Dieser Fehler ist unabhängig von der verkürzten Chrominanz-Tabelle.

Behebung: jeden skalierten Tabellenwert vor der Typkonvertierung auf `[1,255]` begrenzen; auch den öffentlichen Encoder-Konstruktor gegen ungültige Qualität absichern.

### 9. [P2] BEHOBEN – forceNewQuality ersetzt Tabellen ohne Neuquantisierung

Stellen: `src/encoder.js:260–265`, unveränderte Koeffizientenverwendung in Zeile 293.

`save(captured, meta, true)` schreibt die Tabellen des neuen Encoders, codiert aber die bereits mit den alten Tabellen quantisierten Koeffizienten unverändert. Das ändert Helligkeit und Frequenzamplituden statt nur die Qualität. Reproduktion: Ein Graublock mit DC 64 und ursprünglicher Quantisierung 1 rendert als 136; nach `new Encoder(50).save(..., true)` wird er als **255** decodiert.

Behebung: die Koeffizienten anhand der alten, komponentenspezifischen Quantisierung dequantisieren und mit der neuen Tabelle neu quantisieren, bevor sie geschrieben werden.

## Historische Validierung beim ursprünglichen Review (vor den Fixes)

- Alle sechs vorhandenen Testsuiten wurden einzeln ausgeführt und bestanden: smoke, render, contracts, decode-fixtures, encode-roundtrip und arithmetic-fixture.
- Das vorhandene Bundle stimmt bytegenau mit der anhand des Build-Manifests zusammengesetzten Standardausgabe überein. Die Befunde betreffen also auch die modularen Quellen.
- Die Zusatzreproduktionen stehen in `reproduce.cjs` in diesem Verzeichnis. Aus `Repo` ausführen: `node artifacts/review/reproduce.cjs`.
- Der Restart-Vergleich nutzt die bereits vorhandenen lokalen Dateien `dev/libjpeg-turbo-build/cjpeg.exe` und `../Referenz/jpeg-js-decoder.js`. Das Skript schreibt nur Review-Artefakte in sein eigenes Verzeichnis.
- Die bisherigen Transformationsprüfungen prüfen überwiegend Struktur/Dimensionen; die Encoder-Roundtrips verwenden den eigenen Decoder. Das erklärt, warum die oben genannten Fehler trotz grüner Tests bestehen.
- Kein vollständiger Fuzzing-, Performance-, Sicherheits- oder Rust-Audit. Insbesondere ist aus den bestehenden Arithmetic-Smoke-Tests keine vollständige Pixelkorrektheit aller SOF9/SOF10-Varianten ableitbar.
