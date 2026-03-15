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
