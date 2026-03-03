# IME/CJK + Unicode Width Correctness Test Matrix (v2)

## Goal
Validate end-to-end text input/output correctness in Terminal Pro across IME pipelines, unicode width/wrapping, copy/paste, and resize behavior.

## Required Platforms
- Linux (ibus and fcitx)
- macOS (native input methods)
- Windows (Microsoft IME)

## Required Shells
- `bash`
- `zsh`
- `fish`
- `pwsh` (Windows + optional Linux/macOS install)

## Test Matrix Dimensions
- OS: Linux, macOS, Windows
- Input engine: IME on/off
- Shell: bash/zsh/fish/pwsh
- Columns: 80 / 120 / 160
- Font size: 12 / 14
- Mode: plain terminal / agent mode

## Case Catalog
1. CJK direct input:
   - `你好世界`
   - `こんにちは世界`
   - `안녕하세요 세계`
2. Dead-key composition:
   - `é ñ ø â ü`
3. Combining marks:
   - `e\u0301 a\u0302 o\u0308`
   - Arabic diacritics
4. Emoji + ZWJ:
   - `😀 😎 🧪`
   - `👨‍👩‍👧‍👦 🧑‍💻 🏳️‍🌈`
5. Mixed RTL/LTR:
   - `שלום 123 مرحبا abc`
6. Multiline paste:
   - CJK + emoji + combining text block (20+ lines)
7. Cursor-edit invariants:
   - Left/right arrow through mixed-width glyphs
   - Backspace/delete at grapheme boundaries

## Command Harness
Run these in the terminal pane:

```bash
printf 'CJK: 你好世界 こんにちは世界 안녕하세요 세계\n'
printf 'Emoji: 😀 😎 🧪\n'
printf 'ZWJ: 👨‍👩‍👧‍👦 🧑‍💻 🏳️‍🌈\n'
printf 'Combining: e\u0301 a\u0302 o\u0308\n'
printf 'RTL: שלום 123 مرحبا abc\n'
```

```bash
for i in $(seq 1 2000); do
  printf '[%04d] mix=你好😀e\u0301👨‍👩‍👧‍👦 שלום مرحبا\n' "$i"
done
```

## Execution Checklist (per matrix cell)
1. Input each Case Catalog string manually using IME/dead-keys.
2. Validate cursor movement and edit behavior at glyph boundaries.
3. Paste multiline payload, then copy and verify round-trip equality.
4. Resize rapidly between 80/120/160 columns while output is active.
5. Confirm no visual overlap, drift, or truncation.

## Metrics & Evidence
- Runtime errors: `renderer-errors.ndjson`
- PTY metrics: Structured → `PTY Metrics` button
- Optional torture log: `scripts/pty-torture.sh`
- Record per-run:
  - `os`, `shell`, `ime`, `cols`, `fontSize`
  - `pass/fail`
  - `defect notes`

## Pass Criteria
- No dropped/duplicated characters.
- No incorrect wrap alignment for wide/ZWJ/combining clusters.
- Cursor stays coherent during edit navigation.
- Copy/paste preserves grapheme clusters.
- No renderer exceptions or PTY corruption.

## Fail Severity
- `P0`: Crash, data loss, corrupted input.
- `P1`: Incorrect cursor/wrap for common sequences.
- `P2`: Cosmetic misalignment without data corruption.
