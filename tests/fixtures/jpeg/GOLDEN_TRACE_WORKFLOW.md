# Arithmetic Golden Trace Workflow

This document defines a reproducible workflow for comparing strict arithmetic decode traces.

## 1) Export a trace from a fixture

```powershell
npm run trace:export -- tests/fixtures/jpeg/libjpeg-turbo-testimgari.jpg artifacts/arith-trace-current.txt 128
```

Output format:

- `input=...`
- `traceLimit=...`
- `count=...`
- one line per decision step (`#N phase ...`)

## 2) Create or update a local golden trace

Keep golden traces in `artifacts/` (currently ignored by git) while iterating:

```powershell
Copy-Item artifacts/arith-trace-current.txt artifacts/arith-trace-golden.txt -Force
```

When the arithmetic model is stable enough, decide explicitly whether to check a golden trace into version control.

## 3) Compare current vs golden

```powershell
npm run trace:diff -- artifacts/arith-trace-golden.txt artifacts/arith-trace-current.txt
```

`trace:diff` reports:

- `MATCH (N steps)` if identical
- `DIVERGENCE at step X` plus both lines when first mismatch is found

## 4) Suggested debugging loop

1. Run `npm test`
2. Export strict trace
3. Diff against golden
4. Fix first divergence only
5. Repeat

This keeps arithmetic debugging deterministic and avoids chasing secondary effects.

