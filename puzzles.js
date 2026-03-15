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
