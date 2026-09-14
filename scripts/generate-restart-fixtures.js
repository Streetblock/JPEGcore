const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const cjpeg = process.env.CJPEG_PATH || path.join(root, "dev/libjpeg-turbo-build/cjpeg.exe");
const out = path.join(root, "tests/fixtures/jpeg/restart");
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "jpegcore-restart-"));
const input = path.join(temp, "pattern.ppm");
const w = 33, h = 19;
const rgb = Buffer.alloc(w * h * 3);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 3;
  rgb[i] = (x * 11 + y * 3) & 255;
  rgb[i + 1] = (x * 7 + y * 13) & 255;
  rgb[i + 2] = (x * 3 + y * 17) & 255;
}
fs.writeFileSync(input, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), rgb]));
const hashes = {};
try {
  for (const mode of ["GRAY", "444", "422", "420"]) {
    for (const coding of ["baseline", "progressive"]) {
      for (const interval of [0, 1, 3]) {
        const name = `${coding}-${mode}-rst${interval}.jpg`;
        const args = ["-quality", "90", ...(mode === "GRAY" ? ["-grayscale"] : ["-sample", {444:"1x1",422:"2x1",420:"2x2"}[mode]]),
          ...(coding === "progressive" ? ["-progressive"] : []),
          ...(interval ? ["-restart", `${interval}B`] : []), "-outfile", path.join(out, name), input];
        const result = spawnSync(cjpeg, args, { encoding: "utf8", windowsHide: true });
        if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
        hashes[name] = crypto.createHash("sha256").update(fs.readFileSync(path.join(out, name))).digest("hex");
      }
    }
  }
  fs.writeFileSync(path.join(out, "sha256.json"), JSON.stringify(hashes, null, 2) + "\n");
} finally {
  fs.unlinkSync(input);
  fs.rmdirSync(temp);
}
console.log("Generated 24 restart fixtures from an original synthetic RGB pattern.");
