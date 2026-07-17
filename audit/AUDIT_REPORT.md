# Comprehensive repository audit

- Files: **6**
- Bytes: **35,595**
- Findings: CRITICAL 0, HIGH 0, MEDIUM 9, LOW 1

## Syntax checks

- PASS `script.js` (JS)

## Findings

- **MEDIUM · html-sink** `script.js:142` — innerHTML assignment
- **MEDIUM · html-sink** `script.js:229` — innerHTML assignment
- **MEDIUM · html-sink** `script.js:237` — innerHTML assignment
- **MEDIUM · html-sink** `script.js:241` — insertAdjacentHTML
- **MEDIUM · html-sink** `script.js:244` — insertAdjacentHTML
- **MEDIUM · html-sink** `script.js:274` — innerHTML assignment
- **MEDIUM · html-sink** `script.js:280` — innerHTML assignment
- **MEDIUM · html-sink** `script.js:307` — innerHTML assignment
- **MEDIUM · html-sink** `script.js:318` — innerHTML assignment
- **LOW · storage** `docs/IDEAS.md:18` — localStorage is user-controlled

## Structure

- Workflows: none
- Manifests: none
- Tests: none
- Backup-like paths: 0
- Tracked but ignored: none
- Duplicate file groups: 0


## Largest files

- `script.js` — 23,811 bytes, 603 lines
- `style.css` — 6,959 bytes, 189 lines
- `index.html` — 2,125 bytes, 59 lines
- `AGENTS.md` — 1,717 bytes, 37 lines
- `docs/IDEAS.md` — 916 bytes, 21 lines
- `README.md` — 67 bytes, 8 lines

## Limitations

- Pattern matches require manual validation.
- Static audit does not exercise production networking, visual layout, or every user interaction.
