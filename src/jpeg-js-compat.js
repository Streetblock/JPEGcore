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