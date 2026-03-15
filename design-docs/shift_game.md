# SHIFT: Word Ladder Puzzle Game

## Summary

SHIFT is a daily word puzzle game in the spirit of Wordle and NYT Connections. Players are given a start word and an end word of equal length, and must transform the start into the end in exactly N moves — changing only one letter per move, with each intermediate result required to be a valid English word. No word may be repeated.

The game is scoped as a local proof-of-concept runnable entirely in a browser against a lightweight local web server. There is no cloud infrastructure, no accounts, and no persistent backend storage. A single daily puzzle is served to all local players, and results can be copied as an emoji share string in the style of NYT games.

The core design challenge is threefold: (1) curating a puzzle set where valid paths of exactly N moves exist, (2) enforcing move validity efficiently in the browser, and (3) delivering a clean, satisfying UX that rewards precision over speed.

## Goals

- Build a playable, locally-hosted browser game where users solve daily word-ladder puzzles in exactly N moves.
- Validate each player move in real time: one letter changed, result is a valid English word, no repeats allowed.
- Track solve time and attempt count per session, displayed post-solve.
- Generate an NYT-style emoji share string for social sharing (copy to clipboard).
- Keep the entire stack runnable with a single local command (e.g., `python -m http.server` or a minimal Node server).

## Non-Goals

- No user accounts, authentication, or persistent profiles.
- No cloud deployment, AWS, or any hosted infrastructure.
- No multiplayer or real-time features.
- No mobile-native app (browser-only is sufficient for POC).
- No procedural puzzle generation at runtime — puzzles are pre-curated and bundled.
- No leaderboards or server-side score tracking.
- No support for languages other than English.

## Proposed Design

### High-Level Architecture

The game is a single-page application (SPA) served by a minimal local HTTP server. All game logic runs in the browser. The server's only job is to serve static files.

```
[ Local HTTP Server ]
        |
        | serves static files
        v
[ Browser SPA ]
  ├── index.html       — shell, game board, modals
  ├── main.js           — entry point; wires modules together
  ├── game.js          — core game logic (state machine, move validation)
  ├── puzzles.js        — bundled puzzle definitions (start, end, N, date key)
  ├── dictionary.js     — word validity lookup (Set or trie over word list)
  ├── ui.js             — DOM rendering, animations, share string display
  └── style.css         — layout and visual design
```

### Key Components

**Puzzle Store (`puzzles.js`)**
A static, pre-authored list of daily puzzles. Each puzzle is a plain object:
```
{ id, date, startWord, endWord, moves, solution[] }
```
The active puzzle is selected by matching today's date against the `date` field, with a fallback index for local testing. Solutions are stored for post-solve reference only (e.g., revealing a valid path after failed attempts) and are never exposed during active play.

**Dictionary (`dictionary.js`)**
A JavaScript `Set` built from a bundled word list (e.g., the standard 10k–170k English word corpus as a newline-delimited `.txt` file loaded at startup). Lookup is O(1). The word list is filtered to the relevant word lengths at load time.

**Game Engine (`game.js`)**
A small state machine managing the following state:
- `currentChain`: array of words the player has entered so far, starting with `startWord`.
- `movesRemaining`: countdown from N.
- `status`: `playing | solved`.
- `startTime` / `elapsedTime`: for timing the solve.
- `attemptCount`: number of full resets.

Move validation logic (synchronous, in-browser):
1. Confirm the candidate word is exactly one letter different from the previous word.
2. Confirm the candidate word exists in the dictionary Set.
3. Confirm the candidate word has not appeared in `currentChain`.
4. If `movesRemaining === 1`, also confirm the candidate equals `endWord`.

**UI Layer (`ui.js`)**
Renders the game board as a vertical stack of word "slots." The current slot accepts keyboard input. Completed slots display the entered word without any coloring during active play — no live tile coloring is shown while the puzzle is in progress.

Post-solve modal shows:
- Solved / Not Solved status.
- Elapsed time.
- Attempt count.
- Emoji share string with copy-to-clipboard button.

**Share String Generator**
Produces an output in the format:
```
SHIFT #<puzzle_id>
🟦🟦🟦🟦
Perfect | 0:47
```
Each tile represents one move slot up to N. A filled tile (🟦) means a move was made on that step; an empty tile (⬜) appears only if `buildShareString` is called before the game is finished (i.e., mid-game state). The grid therefore shows move count visually, not adherence to any canonical path. "Perfect" is awarded when the player solves on their first attempt with no resets, regardless of which valid path was taken.

### Puzzle Curation

Puzzles are hand-authored or generated offline using a graph traversal tool (not part of the runtime). The curator tool (a standalone script, not shipped with the game) builds a word-adjacency graph for a given word length and finds all shortest paths between two words. Puzzles are selected to ensure:
- At least one valid path of exactly N moves exists.
- No trivially obvious paths (e.g., changing one letter to reach the answer immediately).
- The path is not unique (multiple solutions exist), reducing frustration.

Curated puzzles are committed to `puzzles.js` as a static list.

## Data Flow / Interfaces

```
Startup
  └── Load puzzles.js → select today's puzzle by date
  └── Load word list (.txt) → build dictionary Set filtered by word length
  └── Pass isValidWord() function to game engine (game.js imports/receives dictionary.js)
  └── Render initial board state (startWord locked, endWord shown, N slots between)

Player Input Loop
  └── Keystroke captured in active slot
  └── On Enter: validate candidate word
        ├── FAIL: show inline error (shake animation, error message)
        └── PASS: append to currentChain, advance slot, decrement movesRemaining
              ├── movesRemaining > 0: continue
              └── movesRemaining === 0:
                    └── word === endWord → status = solved → show success modal
                        (player can reset and try again via the modal)

Reset / Retry
  └── Clear currentChain (keep startWord), reset movesRemaining, increment attemptCount
  └── status = playing

Share
  └── Generate emoji grid from currentChain length (filled tile per move made, empty tiles for unused slots)
  └── Copy string to clipboard via navigator.clipboard.writeText()
```

### Interfaces / Boundaries

| Boundary | Description |
|---|---|
| Server → Browser | Static file delivery only; no API endpoints. |
| puzzles.js → game.js | Puzzle object: `{ id, date, startWord, endWord, moves, solution[] }` |
| dictionary.js → game.js | `isValidWord(word: string): boolean` |
| game.js → ui.js | Game state object passed on each state transition; UI is a pure renderer. |
| ui.js → clipboard | `navigator.clipboard.writeText(shareString)` |

## Alternatives Considered

### 1. Pure static files with no server (file:// protocol)

Serve `index.html` directly from disk without any local server.

- **Pros**: Zero setup — just open the file in a browser. No dependencies.
- **Cons**: Browsers block `fetch()` and module imports under `file://` by default. The word list and puzzle file would need to be inlined into JS, increasing bundle size. CORS restrictions make this fragile across browsers.
- **Recommendation**: Acceptable only if all assets are fully inlined. For a cleaner dev experience, a minimal server is preferred.

### 2. Minimal Python/Node local server (Recommended)

A single-command local server (`python3 -m http.server 8080` or `npx serve .`) serves all static assets with no build step.

- **Pros**: No framework overhead, no build pipeline, trivially reproducible. `fetch()` works normally. The entire game is still static files.
- **Cons**: Requires Python 3 or Node to be installed (both are universally available on developer machines).
- **Recommendation**: This is the preferred approach. One command, zero configuration.

### 3. Lightweight framework (Vite + React/Vue)

Use a modern frontend framework for component-based UI and hot reload during development.

- **Pros**: Better developer experience for larger teams; component model scales well; easier to add animations.
- **Cons**: Adds a build step and `node_modules` dependency; overkill for a POC with ~4 screens and minimal state.
- **Recommendation**: Not recommended for this POC. Worth revisiting if the project grows.

### 4. Server-side word validation via local API

Run a small Express or FastAPI server that exposes a `/validate` endpoint. The browser POSTs candidate words and the server responds with valid/invalid.

- **Pros**: Keeps word list off the client; harder to cheat by inspecting JS.
- **Cons**: Adds latency to every keystroke-based validation; requires a real server process; unnecessary complexity for a local POC where cheating prevention is not a goal.
- **Recommendation**: Not recommended. All validation should be client-side for this POC.

## Risks / Edge Cases

- **No valid path of exactly N moves**: If a puzzle is miscurated, the player can never win. Mitigation: offline path-verification script must be run against every puzzle before it is added to `puzzles.js`.
- **Word list gaps**: Common words missing from the dictionary (proper nouns, slang) will cause valid-feeling guesses to be rejected. Mitigation: use a well-known, broad corpus (e.g., ENABLE word list or Scrabble TWL) and allow the puzzle curator to manually add missing words.
- **Tie between multiple solution paths**: Players may take different valid routes to the end word. The share string tiles reflect only how many moves were made, not which path was taken, so all valid solves of the same length produce identical grids. "Perfect" is defined by first-attempt solve, not path match.
- **Date/timezone mismatch**: Players in different timezones may see different puzzles if puzzle selection is date-based. Mitigation: for local POC, use a fixed puzzle index or UTC date. Document this limitation clearly.
- **Clipboard API unavailability**: `navigator.clipboard` requires a secure context (HTTPS or localhost). `localhost` satisfies this, but `file://` does not. Mitigation: provide a fallback `document.execCommand('copy')` or display the share string in a selectable text box.
- **Single-path puzzles being unsolvable for some players**: If the only valid path requires obscure words, frustration is high. Mitigation: puzzle curation should verify at least 3 distinct valid paths exist.

## Testing & Validation

- **Unit tests for move validator**: Test all four validation rules (one-letter diff, dictionary membership, no repeat, final-move target matching) with positive and negative cases. Can be run in Node without a browser.
- **Puzzle path verifier**: A standalone script that loads `puzzles.js` and confirms that for each puzzle, at least one valid path of exactly N moves exists in the word graph. Run this before every merge to `puzzles.js`.
- **Manual playtesting**: Each puzzle should be played to completion by at least one human before shipping.
- **Cross-browser smoke test**: Verify the game loads and plays correctly in Chrome, Firefox, and Safari (all on desktop).
- **Share string output test**: Confirm emoji grid output matches expected format for both solved and unsolved states.

## Rollout / Monitoring

This is a local POC with no deployment pipeline or monitoring infrastructure. Rollout is:

1. Clone the repo.
2. Run `python3 -m http.server 8080` (or equivalent) from the project root.
3. Open `http://localhost:8080` in a browser.

For demo purposes, a `?puzzle=<id>` query parameter should override the date-based puzzle selection so any puzzle can be demoed on demand.

There is no server-side analytics or error tracking. Any bugs are surfaced through manual playtesting.

## Open Questions

- **How many puzzles should ship with the POC?**
  - **Recommendation**: 7–14 puzzles (one to two weeks of daily content) is sufficient to demonstrate the concept without requiring extensive curation effort.

- **Should the word list be bundled as an inline JS array or fetched as a `.txt` file at startup?**
  - **Recommendation**: Fetch as a `.txt` file. A full word list (e.g., ENABLE at ~170k words) is ~1.5 MB — fine to fetch once on load, and keeps `dictionary.js` clean. Filter to relevant word lengths in memory.

- **Should there be a hint system?**
  - **Recommendation**: No hints for the POC. Hints add UX complexity and dilute the core "elegant constraint" feel of the game. Revisit if user feedback indicates frustration.

- **Should failed attempts show the canonical solution?**
  - **Recommendation**: Yes, after the player exhausts all retries (e.g., 3 attempts), reveal one valid solution path. This prevents players from feeling stuck with no recourse.

- **What word lengths and move counts make for the best puzzles?**
  - **Recommendation**: Start with 4-letter words at 4 moves (Easy) and 5-letter words at 5 moves (Hard). These are the best-tested configurations in published word-ladder research and provide a satisfying difficulty curve.

---

## Phased Implementation Plan

### Phase 1: Project Scaffolding

#### Summary
Create the full file structure for the SPA, establish module boundaries, and verify the local server can serve all files. This phase produces a working (blank) skeleton that loads without errors in the browser. No game logic is implemented yet — only the shell HTML, empty JS module stubs with exported function signatures, the CSS reset, and the word list asset.

#### Prerequisites
- Python 3 installed (for `python3 -m http.server`).
- A copy of the ENABLE word list (`enable1.txt`, ~172k words, one word per line) available to be committed to the repo.

#### Files to Modify
- `index.html` (NEW) — Shell HTML with `<div id="app">` mount point, `<link>` to `style.css`, and `<script type="module" src="main.js">` entry point.
- `main.js` (NEW) — Entry point; imports `puzzles.js`, `dictionary.js`, `game.js`, `ui.js` and calls the top-level `init()` function. No logic yet beyond a `console.log('SHIFT loaded')`.
- `puzzles.js` (NEW) — Exports an empty `PUZZLES` array and a stub `getPuzzleForToday()` function.
- `dictionary.js` (NEW) — Exports a stub `buildDictionary(wordLength)` async function that returns an empty `Set`.
- `game.js` (NEW) — Exports a stub `createGame(puzzle, isValidWord)` factory function that returns a placeholder state object.
- `ui.js` (NEW) — Exports a stub `renderBoard(state)` function and a stub `showModal(type, state)` function that do nothing.
- `style.css` (NEW) — CSS custom properties for color palette, a basic box-sizing reset, and font stack. No layout rules yet.
- `words/enable1.txt` (NEW) — The ENABLE word list committed verbatim as a plain text asset.

#### Implementation Details

**`index.html` structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SHIFT</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <header id="header"></header>
    <main id="board"></main>
    <div id="modal-overlay" class="hidden"></div>
  </div>
  <script type="module" src="main.js"></script>
</body>
</html>
```

**`main.js` stub:**
```js
import { getPuzzleForToday } from './puzzles.js';
import { buildDictionary } from './dictionary.js';
import { createGame } from './game.js';
import { renderBoard } from './ui.js';

async function init() {
  console.log('SHIFT loaded');
  const puzzle = getPuzzleForToday();
  const dict = await buildDictionary(puzzle ? puzzle.startWord.length : 4);
  const game = createGame(puzzle, (w) => dict.has(w));
  renderBoard(game.getState());
}

init();
```

**`puzzles.js` stub:**
```js
export const PUZZLES = [];

export function getPuzzleForToday() {
  return null;
}
```

**`dictionary.js` stub:**
```js
export async function buildDictionary(wordLength) {
  return new Set();
}
```

**`game.js` stub:**
```js
export function createGame(puzzle, isValidWord) {
  return {
    getState() { return { status: 'playing' }; }
  };
}
```

**`ui.js` stub:**
```js
export function renderBoard(state) {}
export function showModal(type, state) {}
```

Note: `ui.js` will include a module-local `formatTime` helper (added in Phase 4) to format elapsed seconds as `M:SS`. This avoids any cross-module private function reference.

**`style.css` custom properties block:**
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-bg: #ffffff;
  --color-surface: #f9f9f9;
  --color-border: #d3d6da;
  --color-text: #1a1a1b;
  --color-accent: #3b82f6;
  --color-error: #ef4444;
  --color-success: #22c55e;
  --font-main: 'Segoe UI', system-ui, sans-serif;
}

body {
  font-family: var(--font-main);
  background: var(--color-bg);
  color: var(--color-text);
}
```

**Server command** to verify: `python3 -m http.server 8080` from the project root. Navigate to `http://localhost:8080` — browser console should show `SHIFT loaded` with no 404s or module errors.

#### Tests

**Manual tests only for this phase:**
- Open `http://localhost:8080` in Chrome, Firefox, and Safari.
- Browser console shows `SHIFT loaded` with no errors.
- All six `.js` files and `style.css` return HTTP 200 in the Network tab.
- `words/enable1.txt` is accessible at `http://localhost:8080/words/enable1.txt` and returns plain text.

#### Completion Criteria
- [x] All seven source files created and committed.
- [x] `words/enable1.txt` committed to repo.
- [x] `python3 -m http.server 8080` serves the page with zero console errors.
- [x] All three browser smoke tests pass.

---

### Phase 2: Dictionary + Puzzle Store

#### Summary
Implement the real `buildDictionary()` that fetches and parses `enable1.txt`, the real `getPuzzleForToday()` that selects a puzzle by UTC date (with `?puzzle=<id>` override), and a starter set of 7 hand-authored puzzles. At the end of this phase, the console can confirm a valid puzzle is selected and the dictionary is queryable.

#### Prerequisites
- Phase 1 complete (all stubs exist, server works, `enable1.txt` committed).

#### Files to Modify
- `dictionary.js` — Replace stub with real fetch + parse implementation.
- `puzzles.js` — Replace stub with 7 puzzle objects and real selection logic.
- `test_puzzles.js` (NEW) — Node-runnable assertions against `puzzles.js` schema.

#### Implementation Details

**`dictionary.js` — full implementation:**
```js
let _dict = null; // loaded once on first call

export async function buildDictionary(wordLength) {
  if (_dict) return _dict;

  const response = await fetch('./words/enable1.txt');
  if (!response.ok) throw new Error(`Failed to load word list: ${response.status}`);
  const text = await response.text();

  const set = new Set();
  for (const raw of text.split('\n')) {
    const w = raw.trim().toLowerCase();
    if (w.length === wordLength) set.add(w);
  }

  _dict = set;
  return _dict;
}
```

- Return type: `Promise<Set<string>>` — all entries are lowercase, trimmed, filtered to `wordLength`.
- The module-level `_dict` is loaded once and reused. For this POC all puzzles use the same word length, so one load is sufficient.
- Words are stored lowercase; all callers must normalize input to lowercase before calling `set.has()`.

**`puzzles.js` — full implementation:**

Puzzle schema (TypeScript-style for reference):
```ts
interface Puzzle {
  id: number;           // unique sequential integer
  date: string;         // 'YYYY-MM-DD' UTC date this puzzle is scheduled
  startWord: string;    // lowercase
  endWord: string;      // lowercase, same length as startWord
  moves: number;        // exact number of moves required
  solution: string[];   // one valid path, e.g. ['cold','cord','word','worm','warm']
}
```

```js
export const PUZZLES = [
  { id: 1, date: '2026-03-14', startWord: 'wine', endWord: 'dine', moves: 2, solution: ['wine','vine','dine'] },
  { id: 2, date: '2026-03-15', startWord: 'cold', endWord: 'warm', moves: 4, solution: ['cold','cord','word','ward','warm'] },
  { id: 3, date: '2026-03-16', startWord: 'cat',  endWord: 'dog',  moves: 3, solution: ['cat','cot','dot','dog'] },
  { id: 4, date: '2026-03-17', startWord: 'like', endWord: 'love', moves: 3, solution: ['like','life','live','love'] },
  { id: 5, date: '2026-03-18', startWord: 'fire', endWord: 'hide', moves: 2, solution: ['fire','hire','hide'] },
  { id: 6, date: '2026-03-19', startWord: 'hate', endWord: 'love', moves: 3, solution: ['hate','late','lave','love'] },
  { id: 7, date: '2026-03-20', startWord: 'cape', endWord: 'care', moves: 2, solution: ['cape','came','care'] },
];

export function getPuzzleForToday() {
  // Allow ?puzzle=<id> override for demo/testing.
  // Node guard: window is not defined in Node (e.g., when running test_puzzles.js),
  // so skip the query-param check entirely in that environment.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const overrideId = params.get('puzzle');
    if (overrideId !== null) {
      const found = PUZZLES.find(p => String(p.id) === overrideId);
      if (found) return found;
    }
  }

  // Select by UTC date string 'YYYY-MM-DD'
  const today = new Date().toISOString().slice(0, 10);
  const byDate = PUZZLES.find(p => p.date === today);
  if (byDate) return byDate;

  // Fallback: wrap-around by day-of-year index
  const dayOfYear = Math.floor(
    (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000
  );
  return PUZZLES[dayOfYear % PUZZLES.length];
}
```

Note: the sample `solution` arrays above include `startWord` as the first element and `endWord` as the last. The `moves` count equals `solution.length - 1` (number of transitions). The puzzle curator must verify each `solution` before committing; see Phase 1 note on the offline path-verifier script.

**`main.js` update** — add console logging to verify puzzle selection:
```js
async function init() {
  const puzzle = getPuzzleForToday();
  console.log('Puzzle:', puzzle);
  const dict = await buildDictionary(puzzle.startWord.length);
  console.log(`Dictionary size for length ${puzzle.startWord.length}: ${dict.size}`);
  const game = createGame(puzzle, (w) => dict.has(w.toLowerCase()));
  renderBoard(game.getState());
}
```

#### Tests

**Manual browser tests:**
- Load `http://localhost:8080` — console shows the selected puzzle object for today's date.
- Load `http://localhost:8080?puzzle=2` — console shows puzzle id 2 regardless of date.
- Console shows dictionary size > 0 (expect ~4000–6000 words for 4-letter words).
- Load `http://localhost:8080?puzzle=999` (non-existent id) — falls back to date-based selection without throwing.

**Extractable unit tests (can be run in Node via `node --experimental-vm-modules`):**

```js
// test_puzzles.js
import { PUZZLES, getPuzzleForToday } from './puzzles.js';

// test_allPuzzlesHaveRequiredFields
for (const p of PUZZLES) {
  console.assert(typeof p.id === 'number', `puzzle ${p.id}: id must be number`);
  console.assert(typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date), `puzzle ${p.id}: bad date`);
  console.assert(p.startWord.length === p.endWord.length, `puzzle ${p.id}: word length mismatch`);
  console.assert(Array.isArray(p.solution) && p.solution.length === p.moves + 1, `puzzle ${p.id}: solution length != moves+1`);
  console.assert(p.solution[0] === p.startWord, `puzzle ${p.id}: solution[0] != startWord`);
  console.assert(p.solution[p.solution.length - 1] === p.endWord, `puzzle ${p.id}: solution[-1] != endWord`);
}

// test_noDuplicateDates
const dates = PUZZLES.map(p => p.date);
const uniqueDates = new Set(dates);
console.assert(uniqueDates.size === dates.length, 'duplicate dates found in PUZZLES');

// test_noDuplicateIds
const ids = PUZZLES.map(p => p.id);
const uniqueIds = new Set(ids);
console.assert(uniqueIds.size === ids.length, 'duplicate ids found in PUZZLES');

// test_consecutiveSolutionWordsAreOneDiff
for (const p of PUZZLES) {
  for (let i = 0; i < p.solution.length - 1; i++) {
    const a = p.solution[i], b = p.solution[i + 1];
    let diffs = 0;
    for (let j = 0; j < a.length; j++) { if (a[j] !== b[j]) diffs++; }
    console.assert(diffs === 1, `puzzle ${p.id}: solution[${i}]→solution[${i+1}] is not one-letter diff`);
  }
}

// test_allSolutionWordsAreSameLength
for (const p of PUZZLES) {
  for (let i = 0; i < p.solution.length; i++) {
    console.assert(p.solution[i].length === p.startWord.length, `puzzle ${p.id}: solution[${i}] length mismatch`);
  }
}
```

#### Completion Criteria
- [x] `buildDictionary(4)` returns a `Set` with >2000 entries.
- [x] `getPuzzleForToday()` returns today's puzzle when a matching date exists.
- [x] `?puzzle=<id>` override works in the browser.
- [x] All unit assertions in `test_puzzles.js` pass.
- [x] Console shows puzzle object and dictionary size on load with no errors.

---

### Phase 3: Game Engine

#### Summary
Implement the full state machine in `game.js`: move validation, state transitions (`playing → solved`), reset/retry, and the share string generator. At the end of this phase the entire game logic is functional and testable in Node — no browser or DOM required.

#### Prerequisites
- Phase 2 complete (`buildDictionary` and `getPuzzleForToday` fully implemented).

#### Files to Modify
- `game.js` — Replace stub with full state machine implementation.
- `test_game.js` (NEW) — Unit test file runnable in Node.

#### Implementation Details

**`game.js` — full implementation:**

```js
export function createGame(puzzle, isValidWord) {
  // --- internal state ---
  let currentChain = [puzzle.startWord.toLowerCase()];
  let movesRemaining = puzzle.moves;
  let status = 'playing'; // 'playing' | 'solved'
  let startTime = Date.now();
  let elapsedTime = 0;
  let attemptCount = 1;

  // --- public API ---
  function getState() {
    return {
      puzzle,                  // reference to puzzle object (read-only)
      currentChain: [...currentChain],
      movesRemaining,
      status,
      elapsedTime: status === 'playing'
        ? Math.floor((Date.now() - startTime) / 1000)
        : elapsedTime,
      attemptCount,
    };
  }

  // Returns { ok: true } or { ok: false, error: string }
  function submitWord(candidate) {
    if (status !== 'playing') {
      return { ok: false, error: 'Game is not in playing state.' };
    }

    const word = candidate.trim().toLowerCase();

    if (word.length !== puzzle.startWord.length) {
      return { ok: false, error: `Word must be ${puzzle.startWord.length} letters.` };
    }

    if (!_isOneDiff(currentChain[currentChain.length - 1], word)) {
      return { ok: false, error: 'Must change exactly one letter.' };
    }

    if (!isValidWord(word)) {
      return { ok: false, error: 'Not a valid word.' };
    }

    if (currentChain.includes(word)) {
      return { ok: false, error: 'Word already used.' };
    }

    if (movesRemaining === 1 && word !== puzzle.endWord.toLowerCase()) {
      return { ok: false, error: `Last move must be "${puzzle.endWord}".` };
    }

    // Accept the move
    currentChain.push(word);
    movesRemaining--;

    if (movesRemaining === 0) {
      // word === endWord is guaranteed by the check above
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      status = 'solved';
    }

    return { ok: true };
  }

  function reset() {
    currentChain = [puzzle.startWord.toLowerCase()];
    movesRemaining = puzzle.moves;
    status = 'playing';
    startTime = Date.now();
    elapsedTime = 0;
    attemptCount++;
  }

  // Returns the emoji share string.
  // Note: time formatting is a UI concern handled by formatTime in ui.js.
  // buildShareString embeds raw elapsedTime seconds; the UI formats for display.
  // For the share string text itself, a simple M:SS format is inlined here to
  // keep game.js self-contained for Node testing without importing ui.js.
  function buildShareString() {
    const movesMade = currentChain.length - 1; // excludes startWord
    const tiles = [];
    for (let i = 0; i < puzzle.moves; i++) {
      tiles.push(i < movesMade ? '🟦' : '⬜');
    }
    const perfect = status === 'solved' && attemptCount === 1 ? 'Perfect' : `Attempt ${attemptCount}`;
    const m = Math.floor(elapsedTime / 60);
    const s = elapsedTime % 60;
    const timeStr = `${m}:${String(s).padStart(2, '0')}`;
    return `SHIFT #${puzzle.id}\n${tiles.join('')}\n${perfect} | ${timeStr}`;
  }

  return { getState, submitWord, reset, buildShareString };
}

// --- private helpers ---

function _isOneDiff(a, b) {
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++;
    if (diffs > 1) return false;
  }
  return diffs === 1;
}

// Note: _formatTime is intentionally NOT defined here. Time formatting is a UI
// concern; the canonical formatTime helper lives in ui.js. game.js inlines a
// one-liner for the share string (see buildShareString above) to remain
// Node-testable without importing ui.js.
```

**Key invariants:**
- `currentChain[0]` is always `puzzle.startWord` (lowercase).
- `movesRemaining` decrements by 1 per accepted move; reaches 0 only when `status` transitions to `solved`.
- `submitWord` is the only function that can transition status from `playing` to `solved`. There is intentionally no `failed` path via `submitWord` — a player can only "fail" by exhausting retries externally. The UI layer is responsible for deciding when to stop calling `reset()` and declare failure; this keeps the engine pure and testable.
- `buildShareString` is valid to call in any status; if called mid-game it shows partial tiles.

#### Tests

**`test_game.js` — runnable in Node with `node test_game.js`:**

```js
import { createGame } from './game.js';

// Minimal test harness (no framework needed)
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('FAIL:', msg); }
}

// Stub puzzle and dictionary
const puzzle = {
  id: 99, date: '2099-01-01',
  startWord: 'cat', endWord: 'dog',
  moves: 3,
  solution: ['cat','cot','dot','dog']
};
const validWords = new Set(['cat','cot','dot','dog','cut','cog']);
const isValidWord = (w) => validWords.has(w);

// test_initialState
{
  const g = createGame(puzzle, isValidWord);
  const s = g.getState();
  assert(s.status === 'playing', 'initial status is playing');
  assert(s.currentChain.length === 1, 'chain starts with 1 word');
  assert(s.currentChain[0] === 'cat', 'chain[0] is startWord');
  assert(s.movesRemaining === 3, 'movesRemaining equals puzzle.moves');
  assert(s.attemptCount === 1, 'attemptCount starts at 1');
}

// test_validMove
{
  const g = createGame(puzzle, isValidWord);
  const result = g.submitWord('cot');
  assert(result.ok === true, 'valid move accepted');
  assert(g.getState().currentChain.length === 2, 'chain grows after valid move');
  assert(g.getState().movesRemaining === 2, 'movesRemaining decrements');
}

// test_rejectNotOneDiff
{
  const g = createGame(puzzle, isValidWord);
  const result = g.submitWord('dog'); // two letters different from 'cat'
  assert(result.ok === false, 'rejects two-letter diff');
  assert(result.error === 'Must change exactly one letter.', 'correct error message');
}

// test_rejectNotInDictionary
{
  const g = createGame(puzzle, isValidWord);
  const result = g.submitWord('cxt'); // one diff but not in dict
  assert(result.ok === false, 'rejects word not in dictionary');
  assert(result.error === 'Not a valid word.', 'correct error message');
}

// test_rejectRepeat
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot');
  const result = g.submitWord('cat'); // cat is already in chain
  assert(result.ok === false, 'rejects repeated word');
  assert(result.error === 'Word already used.', 'correct error message');
}

// test_rejectWrongFinalWord
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot');
  g.submitWord('dot');
  const result = g.submitWord('cog'); // valid, one diff, in dict, not repeat — but not endWord on last move
  assert(result.ok === false, 'rejects wrong final word');
}

// test_solveGame
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot');
  g.submitWord('dot');
  const result = g.submitWord('dog');
  assert(result.ok === true, 'correct final word accepted');
  assert(g.getState().status === 'solved', 'status becomes solved');
  assert(g.getState().movesRemaining === 0, 'movesRemaining is 0 after solve');
}

// test_reset
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot');
  g.reset();
  const s = g.getState();
  assert(s.currentChain.length === 1, 'chain resets to 1 word');
  assert(s.movesRemaining === 3, 'movesRemaining resets');
  assert(s.status === 'playing', 'status resets to playing');
  assert(s.attemptCount === 2, 'attemptCount increments after reset');
}

// test_shareStringPerfect
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot'); g.submitWord('dot'); g.submitWord('dog');
  const share = g.buildShareString();
  assert(share.startsWith('SHIFT #99'), 'share starts with SHIFT #id');
  assert(share.includes('🟦🟦🟦'), 'share shows all filled tiles');
  assert(share.includes('Perfect'), 'first-attempt solve is Perfect');
}

// test_shareStringAfterReset
{
  const g = createGame(puzzle, isValidWord);
  g.reset(); // attempt 2
  g.submitWord('cot'); g.submitWord('dot'); g.submitWord('dog');
  const share = g.buildShareString();
  assert(!share.includes('Perfect'), 'non-first attempt is not Perfect');
  assert(share.includes('Attempt 2'), 'shows attempt count');
}

// test_isOneDiff_sameWordReturnsFalse (via submitWord)
{
  const g = createGame(puzzle, isValidWord);
  const result = g.submitWord('cat'); // same as current, zero diffs
  assert(result.ok === false, 'rejects zero-diff word');
}

// test_wrongLengthRejected
{
  const g = createGame(puzzle, isValidWord);
  const result = g.submitWord('cats'); // wrong length
  assert(result.ok === false, 'rejects wrong length');
}

// test_submitWordWhileNotPlaying
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot'); g.submitWord('dot'); g.submitWord('dog'); // solved
  const result = g.submitWord('cat');
  assert(result.ok === false, 'rejects move when not in playing state');
}

// test_formatTime
{
  const g = createGame(puzzle, isValidWord);
  g.submitWord('cot'); g.submitWord('dot'); g.submitWord('dog');
  const share = g.buildShareString();
  // elapsedTime will be 0 seconds in test; should show "0:00"
  assert(share.includes('0:00'), 'time formatted as M:SS');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

#### Completion Criteria
- [x] `node test_game.js` exits with code 0 (all assertions pass).
- [x] All 14 test cases defined above are implemented and green.
- [x] `game.js` exports exactly: `createGame`.
- [x] No DOM globals referenced in `game.js` or `test_game.js`.

---

### Phase 4: UI Layer

#### Summary
Implement the full DOM rendering and input handling in `ui.js` and wire everything together in `main.js`. This phase produces a fully playable, demo-ready game in the browser: a game header, a visible board with locked start/end word slots, an active input slot with auto-uppercase and length enforcement, real-time validation feedback (shake + error message), move acceptance, and post-solve modal with the share string.

#### Prerequisites
- Phase 3 complete (`game.js` exports a working `createGame`).

#### Files to Modify
- `ui.js` — Replace stubs with full DOM rendering, event handling, and header render.
- `style.css` — Add all layout rules, slot styles, animations, modal styles, and header styles.
- `main.js` — Wire `ui.js` callbacks to `game.js` methods; replace console-only init with real game loop.
- `index.html` — No structural changes needed; confirm `id="board"`, `id="header"`, and `id="modal-overlay"` exist.

#### Implementation Details

**`ui.js` — exported functions:**

```js
// Initialize the board DOM. Must be called once on startup.
// container: HTMLElement (document.getElementById('board'))
// state: game state object from game.getState()
// callbacks: { onSubmit(word: string): void, onReset(): void, onShare(): void }
export function initBoard(container, state, callbacks)

// Re-render the board in place after a state change.
// state: game state object from game.getState()
export function renderBoard(state)

// Trigger the shake + error display on the active input slot.
// message: string — the error text to display below the board
export function showError(message)

// Show the post-game modal.
// type: 'solved'
// state: game state object
// shareString: string — pre-built share string
// callbacks: { onShare(): void, onReset(): void }
// Note: there is no 'failed' type — the modal only shows on a successful solve.
export function showModal(type, state, shareString, callbacks)

// Hide any visible modal.
export function hideModal()
```

**Board DOM structure** (rendered by `initBoard` and updated by `renderBoard`):**
```html
<div id="board">
  <div class="slot slot--locked slot--start">HEAD</div>   <!-- startWord, always locked -->
  <div class="slot slot--active">
    <input class="slot-input" maxlength="4" autocomplete="off" />
  </div>
  <!-- additional slot--pending divs for remaining unfilled moves -->
  <div class="slot slot--pending"></div>
  <div class="slot slot--locked slot--end">TAIL</div>     <!-- endWord, always locked -->
  <p class="error-msg"></p>
</div>
```

Rules for rendering slots:
1. Index 0: always `slot--locked slot--start`, displays `puzzle.startWord` in uppercase.
2. Indices 1 through `currentChain.length - 1`: `slot--filled`, displays the entered word in uppercase.
3. Index `currentChain.length`: `slot--active`, contains the `<input>` element.
4. Indices `currentChain.length + 1` through `puzzle.moves - 1`: `slot--pending`, empty.
5. Index `puzzle.moves`: always `slot--locked slot--end`, displays `puzzle.endWord` in uppercase.

The input field in `slot--active` receives focus automatically on `initBoard` and after `renderBoard`.

**Input event handling (inside `initBoard`):**
```js
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    callbacks.onSubmit(input.value);
  }
});
```

No other keydown filtering — browsers handle character input natively for `<input type="text">`.

**`main.js` — full wired init:**
```js
import { getPuzzleForToday } from './puzzles.js';
import { buildDictionary } from './dictionary.js';
import { createGame } from './game.js';
import { initBoard, renderBoard, showError, showModal, hideModal } from './ui.js';

async function init() {
  const puzzle = getPuzzleForToday();
  const dict = await buildDictionary(puzzle.startWord.length);
  const game = createGame(puzzle, (w) => dict.has(w.toLowerCase()));

  const boardEl = document.getElementById('board');

  function handleSubmit(word) {
    const result = game.submitWord(word);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    const state = game.getState();
    renderBoard(state);
    if (state.status === 'solved') {
      showModal('solved', state, game.buildShareString(), {
        onShare: handleShare,
        onReset: handleReset,
      });
    }
  }

  function handleReset() {
    game.reset();
    hideModal();
    renderBoard(game.getState());
  }

  function handleShare() {
    const text = game.buildShareString();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // brief visual confirmation — add a 'Copied!' label for 2 seconds
        document.getElementById('share-btn').textContent = 'Copied!';
        setTimeout(() => {
          document.getElementById('share-btn').textContent = 'Share';
        }, 2000);
      }).catch(() => _fallbackCopy(text));
    } else {
      _fallbackCopy(text);
    }
  }

  initBoard(boardEl, game.getState(), {
    onSubmit: handleSubmit,
    onReset: handleReset,
    onShare: handleShare,
  });
}

function _fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

init();
```

**`style.css` additions (append to Phase 1 base):**

```css
#board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  max-width: 360px;
  margin: 0 auto;
}

.slot {
  width: 100%;
  max-width: 280px;
  height: 52px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.slot--locked { background: var(--color-surface); color: var(--color-text); }
.slot--start  { border-color: var(--color-accent); }
.slot--end    { border-color: var(--color-success); }
.slot--filled { background: #e8f0fe; border-color: var(--color-accent); }
.slot--pending { background: var(--color-surface); }

.slot--active {
  border-color: var(--color-text);
}

.slot-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  outline: none;
}

.error-msg {
  color: var(--color-error);
  font-size: 0.875rem;
  min-height: 1.25em;
  text-align: center;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}

.slot--shake { animation: shake 0.35s ease; }

/* Modal */
#modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
#modal-overlay.hidden { display: none; }

.modal {
  background: var(--color-bg);
  border-radius: 12px;
  padding: 32px 24px;
  max-width: 320px;
  width: 90%;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal h2 { font-size: 1.5rem; }
.modal .share-grid { font-size: 1.5rem; letter-spacing: 0.1em; }
.modal .stat { font-size: 0.9rem; color: #555; }

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}
.btn--primary { background: var(--color-accent); color: #fff; }
.btn--secondary { background: var(--color-surface); border: 1px solid var(--color-border); }
```

**`showModal` implementation detail:**

`showModal` only handles `type === 'solved'`. The modal includes a "Try Again" button wired to `callbacks.onReset`.

Add a module-local `formatTime` helper at the top of `ui.js` (not exported, not shared with other modules):
```js
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

```js
export function showModal(type, state, shareString, callbacks) {
  // type is always 'solved'.
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = ''; // clear previous modal

  const modal = document.createElement('div');
  modal.className = 'modal';

  const lines = shareString.split('\n');
  const timeStr = formatTime(state.elapsedTime);

  modal.innerHTML = `
    <h2>✓ Solved!</h2>
    <div class="share-grid">${lines[1]}</div>
    <div class="stat">Time: ${timeStr} &nbsp;·&nbsp; Attempt: ${state.attemptCount}</div>
    <pre class="share-text">${shareString}</pre>
    <button id="share-btn" class="btn btn--primary">Share</button>
    <button id="retry-btn" class="btn btn--secondary">Try Again</button>
  `;

  overlay.appendChild(modal);
  overlay.classList.remove('hidden');

  document.getElementById('share-btn').addEventListener('click', callbacks.onShare);
  document.getElementById('retry-btn').addEventListener('click', callbacks.onReset);
}
```

**Header — add `renderHeader(puzzle)` to `ui.js`:**

Call once on init. Renders into `#header`:
```html
<header id="header">
  <h1 class="title">SHIFT</h1>
  <div class="meta">#<puzzle.id> &nbsp;·&nbsp; <puzzle.moves> moves</div>
</header>
```

```css
#header { text-align: center; padding: 16px 16px 0; }
#header .title { font-size: 2rem; font-weight: 900; letter-spacing: 0.2em; }
#header .meta  { font-size: 0.85rem; color: #888; margin-top: 4px; }
```

**Input normalization — inside `initBoard`:**
```js
input.addEventListener('input', () => {
  input.value = input.value.slice(0, puzzle.startWord.length).toLowerCase();
  // CSS text-transform: uppercase handles display; stored value stays lowercase
});
```
Pass `input.value` (already lowercase) to `callbacks.onSubmit`.

**`main.js` — add `renderHeader` call:**
```js
async function init() {
  const puzzle = getPuzzleForToday();
  const dict = await buildDictionary(puzzle.startWord.length);
  const game = createGame(puzzle, (w) => dict.has(w.toLowerCase()));

  renderHeader(puzzle);
  const boardEl = document.getElementById('board');
  // ... rest of init unchanged
}
```

#### Tests

**Manual browser tests:**

- Load `http://localhost:8080` — header shows puzzle id and move count; board renders with start word locked at top, end word locked at bottom.
- Type a valid word and press Enter — slot fills, next slot activates.
- Type an invalid word — active slot shakes, error message appears, input clears.
- Type more characters than the word length — excess characters are blocked.
- Complete a valid solve path — modal appears with emoji grid, time, "Perfect" label, and share string.
- Click Share — share string copies to clipboard; button shows "Copied!" for 2 seconds.
- Load `?puzzle=2` — header reflects puzzle 2's id and move count.

#### Completion Criteria
- [x] Header renders with correct puzzle id and move count.
- [x] Board renders correctly for all slot states (locked-start, filled, active, pending, locked-end).
- [x] Input enforces correct word length and displays uppercase.
- [x] Valid word submission fills a slot and advances the active input.
- [x] Invalid submission triggers shake animation and error message.
- [x] Solved modal appears with correct emoji grid, time, attempt count, and share string.
- [x] Share button copies to clipboard (verified in localhost context).
- [x] Retry button resets the board correctly (attempt count increments).
- [x] No console errors during normal play.

---

### Phase 5: Win Trigger Bug Fix

#### Problem

`game.js` counts the end word as one of the `puzzle.moves` — a 4-move puzzle requires 4 `submitWord` calls. But `_renderSlots` in `ui.js` only renders `puzzle.moves - 1` input slots (slots 1 through `puzzle.moves - 1`), because the end word is displayed as a locked slot. After the player fills all intermediate slots, `movesRemaining === 1` with no input slot rendered — the game is stuck and the win screen never appears.

**Root cause:** The rendering and the game engine have mismatched definitions of "how many moves the player types." The engine counts every step including the final one; the renderer treats the end word as display-only.

#### Fix

In `handleSubmit` in `main.js`, after a successful intermediate submit, check if `movesRemaining === 1`. If so, auto-submit the end word immediately (the only valid move at that point, already enforced by the engine). This resolves the stuck state without touching the renderer or the engine.

**`main.js` — updated `handleSubmit`:**

```js
function handleSubmit(word) {
  const result = game.submitWord(word);
  if (!result.ok) {
    showError(result.error);
    return;
  }
  let state = game.getState();
  // The end word slot is locked/display-only, so auto-submit it when it's the only move left.
  if (state.movesRemaining === 1) {
    game.submitWord(puzzle.endWord);
    state = game.getState();
  }
  renderBoard(state);
  if (state.status === 'solved') {
    launchConfetti();
    setTimeout(() => {
      showModal('solved', state, game.buildShareString(), {
        onShare: handleShare,
        onReset: handleReset,
      });
    }, 400);
  }
}
```

#### Files Modified
- `main.js` — `handleSubmit` only

#### Tests
- Load `?puzzle=2` (COLD→WARM, 4 moves). Submit CORD, WORD, WORM — win screen should appear.
- Load `?puzzle=3` (CAT→DOG, 3 moves). Submit COT, DOT — win screen should appear after DOG is auto-submitted.
- Retry after win — board resets, attempt count increments, no stuck state on re-solve.

#### Completion Criteria
- [x] Solving the final intermediate move immediately triggers the win flow.
- [x] No input slot is ever left in an unresponsive state.
- [x] `puzzle.endWord` auto-submit only fires when `movesRemaining === 1` (never earlier).

---

### Phase 6: Confetti + Share Win Experience

#### Motivation

The win moment was abrupt — the modal appeared instantly with no celebration. This phase adds a confetti burst that fires the moment the puzzle is solved, followed by the modal popping in 400ms with a pop-in animation and a clickable share-text block.

#### Changes

**`style.css` — 4 new rule blocks (no existing rules changed):**

```css
#confetti-canvas {
  position: fixed; inset: 0;
  pointer-events: none; z-index: 200;
}

@keyframes modal-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  60%  { transform: scale(1.03); }
  100% { transform: scale(1);    opacity: 1; }
}
.modal--animated {
  animation: modal-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.share-text {
  cursor: pointer; border-radius: 6px;
  padding: 8px; user-select: all;
  transition: background 0.2s;
}
.share-text:hover { background: #f0f4ff; }

@keyframes flash-copied {
  0%   { background: #bbf7d0; }
  100% { background: transparent; }
}
.share-text--copied {
  animation: flash-copied 0.8s ease forwards;
}
```

**`ui.js` — `launchConfetti()` (module-private, exported):**

- Creates `<canvas id="confetti-canvas">` appended to `<body>`, sized to `window.innerWidth/Height`.
- Spawns 2 particles/frame for 60 frames (120 total), then stops emitting.
- Each particle: random x start, falls with gravity (`vy += 0.15`), slight drag (`vx *= 0.99`), rotates.
- Colors: `#3b82f6`, `#22c55e`, `#fbbf24`, `#f472b6`, `#a78bfa`.
- Fades particles out when `y > 70%` of canvas height.
- Self-cleans: removes canvas from DOM once all particles are gone (no leaks, no dangling `rAF`).
- Exported: `export { launchConfetti }`.

**`ui.js` — `showModal` updates:**

1. `modal.className = 'modal modal--animated'` — pop-in animation on every open.
2. Wire the `<pre class="share-text">` element: on click, select all text, copy to clipboard, remove/re-add `share-text--copied` class (same reflow pattern as `.slot--shake`) to flash green.

**`main.js` — 2 changes:**

```js
// Import
import { initBoard, renderBoard, showError, showModal, hideModal, renderHeader, launchConfetti } from './ui.js';

// Win handler inside handleSubmit
if (state.status === 'solved') {
  launchConfetti();
  setTimeout(() => {
    showModal('solved', state, game.buildShareString(), {
      onShare: handleShare,
      onReset: handleReset,
    });
  }, 400);
}
```

#### Files Modified
- `style.css`
- `ui.js`
- `main.js`

#### Tests
1. `python3 -m http.server 8080` from project root.
2. Open `http://localhost:8080?puzzle=3` and solve (CAT→COT→DOT→DOG).
3. Confetti bursts immediately on solve; modal pops in ~400ms with spring animation.
4. Click the share text block — flashes green and copies to clipboard.
5. Click "Share" button — still works as before ("Copied!" on button for 2s).
6. Click "Try Again" — modal closes, board resets, no leftover canvas in DOM.

#### Completion Criteria
- [x] Confetti canvas appears on solve and removes itself after all particles settle.
- [x] Modal has pop-in spring animation on every open.
- [x] Clicking `<pre class="share-text">` copies share string and flashes green.
- [x] "Share" button behavior unchanged.
- [x] No canvas or rAF leak after "Try Again".

---

### Optional: Puzzle Sanity Check Script

Not a required phase — run this before demoing to confirm all puzzle solutions are valid against the ENABLE word list.

Run `node tools/verify_paths.js` after adding or editing puzzles:

**`tools/verify_paths.js`** (run with `node tools/verify_paths.js` from project root):

```js
import { readFileSync } from 'fs';
import { PUZZLES } from '../puzzles.js';

function isOneDiff(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) d++; }
  return d === 1;
}

const wordText = readFileSync(new URL('../words/enable1.txt', import.meta.url), 'utf8');
const dict = new Set(wordText.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));

let anyFail = false;
for (const p of PUZZLES) {
  const sol = p.solution;
  const errs = [];
  if (sol[0] !== p.startWord)              errs.push('solution[0] !== startWord');
  if (sol[sol.length - 1] !== p.endWord)   errs.push('solution[-1] !== endWord');
  if (sol.length - 1 !== p.moves)          errs.push('solution.length-1 !== moves');
  for (let i = 0; i < sol.length - 1; i++) {
    if (!isOneDiff(sol[i], sol[i + 1]))    errs.push(`step ${i}→${i+1} not one-letter diff`);
  }
  for (let i = 1; i < sol.length; i++) {
    if (!dict.has(sol[i]))                 errs.push(`"${sol[i]}" not in dictionary`);
  }
  if (new Set(sol).size !== sol.length)    errs.push('duplicate word in solution');
  if (errs.length) { console.error(`FAIL puzzle ${p.id}:`, errs.join('; ')); anyFail = true; }
  else             { console.log(`PASS puzzle ${p.id} (${p.startWord}→${p.endWord})`); }
}
if (anyFail) process.exit(1);
```

All 7 puzzles should print `PASS`. Exit code 0 means the demo data is clean.

---

## TODO (Code Review Feedback)

### Correctness

- **`dictionary.js` — cache ignores `wordLength` on second call** (`dictionary.js:4-5`): `_dict` is a module-level singleton cached after the first `buildDictionary()` call. If called again with a different `wordLength`, it silently returns the wrong dictionary. Currently safe since `buildDictionary` is called once, but a footgun for multi-round play or testing.

- **`main.js:22-25` — auto-submit end word on `movesRemaining === 1`**: Fires on every successful submit when 1 move remains. For 2-move puzzles this means the user only types one intermediate word. Intentional behavior but should be documented as a game design decision.

- **`puzzles.js:3` — puzzle id=3 uses 3-letter words** (`cat/dog`) while all others use 4-letter words. If a 3-letter puzzle is active and the dictionary was previously built for 4-letter words (caching scenario), all word validations silently fail. Safe today but fragile.

### Security

- **`ui.js:227-234` — `innerHTML` with dynamic data**: `shareString` is interpolated directly into `innerHTML`. Content is built from static puzzle data and integers so no injection risk in practice, but `lines[1]` (the emoji line) is inserted without escaping.

- **`main.js:73` / `ui.js:250` — `document.execCommand('copy')`**: Deprecated in all major browsers. Fine as a last-resort fallback but may stop working.

### UX / Accessibility

- **No submit button on mobile**: The only way to submit a word is pressing `Enter` (`ui.js:70`). Mobile soft keyboards often don't show a visible Enter key in text inputs. A submit button below the active slot is needed for mobile playability.

- **Confetti canvas not resized on `window.resize`** (`ui.js:134-135`): `canvas.width/height` are set once on creation; resizing the window during confetti will clip or missize the animation.

- **No dark mode**: CSS only defines light-mode colors. No `@media (prefers-color-scheme: dark)` block.

### Minor

- **`main.js:49-51`** — `document.getElementById('share-btn')` inside `handleShare` queries the DOM at call time rather than using a reference from the modal setup. Harmless since `handleShare` is only called while modal is open, but could be passed as a ref for clarity.

- **`puzzles.js` — only 7 puzzles**: The wrap-around fallback (`dayOfYear % PUZZLES.length`) means the same puzzles repeat. Fine for a hackathon but will need more content for real use.

### Testing

- **`test_puzzles.js` uses `console.assert`** (no exit code on failure), so CI won't catch failures. Should use `process.exit(1)` on failure like `test_game.js` does.

- **No tests for `ui.js`, `dictionary.js`, or `main.js`**: The DOM-heavy code is untested. Typical for a hackathon but worth noting for future investment.
