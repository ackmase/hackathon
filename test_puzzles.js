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

console.log('All puzzle assertions passed.');
