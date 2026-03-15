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
