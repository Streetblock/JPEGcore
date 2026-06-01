const fs = require("node:fs");
const path = require("node:path");

function usage() {
  console.error("Usage: node scripts/arith-trace-diff.js <traceA.txt> <traceB.txt>");
}

function normalizeLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("input=") && !l.startsWith("traceLimit=") && !l.startsWith("count="));
}

function main() {
  const aPath = process.argv[2];
  const bPath = process.argv[3];
  if (!aPath || !bPath) {
    usage();
    process.exit(2);
  }

  const aText = fs.readFileSync(path.resolve(aPath), "utf8");
  const bText = fs.readFileSync(path.resolve(bPath), "utf8");
  const a = normalizeLines(aText);
  const b = normalizeLines(bText);
  const max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i++) {
    const la = a[i];
    const lb = b[i];
    if (la !== lb) {
      console.log(`DIVERGENCE at step ${i + 1}`);
      console.log(`A: ${la || "<EOF>"}`);
      console.log(`B: ${lb || "<EOF>"}`);
      process.exit(1);
    }
  }

  console.log(`MATCH (${a.length} steps)`);
}

main();

