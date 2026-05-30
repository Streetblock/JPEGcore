const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class TestBlob {
  constructor(parts = []) {
    this._buffer = Buffer.concat(parts.map((part) => {
      if (Buffer.isBuffer(part)) return part;
      if (part instanceof ArrayBuffer) return Buffer.from(part);
      if (ArrayBuffer.isView(part)) return Buffer.from(part.buffer, part.byteOffset, part.byteLength);
      return Buffer.from(part);
    }));
  }

  async arrayBuffer() {
    return this._buffer.buffer.slice(
      this._buffer.byteOffset,
      this._buffer.byteOffset + this._buffer.byteLength
    );
  }
}

class TestImageData {
  constructor(dataOrWidth, width, height) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = width;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = width;
      this.height = height;
    }
  }
}

function loadCore(repoRoot = path.resolve(__dirname, "..", "..")) {
  const sourcePath = path.join(repoRoot, "JPEGcore.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
    ArrayBuffer,
    DataView,
    Blob: TestBlob,
    FileReader: class FileReader {},
    ImageData: TestImageData,
    atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
    btoa: (str) => Buffer.from(str, "binary").toString("base64")
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: "JPEGcore.js" });

  return {
    JpegCORE: vm.runInContext("JpegCORE", context),
    Blob: TestBlob,
    ImageData: TestImageData
  };
}

module.exports = { loadCore, TestBlob, TestImageData };
