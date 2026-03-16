export const PUZZLES = [
  { id: 1,  date: '2026-03-14', startWord: 'wine', endWord: 'race', moves: 4, solution: ['wine','wise','rise','rice','race'] },
  { id: 2,  date: '2026-03-15', startWord: 'cold', endWord: 'warm', moves: 4, solution: ['cold','cord','word','ward','warm'] },
  { id: 3,  date: '2026-03-16', startWord: 'card', endWord: 'firm', moves: 4, solution: ['card','hard','harm','farm','firm'] },
  { id: 4,  date: '2026-03-17', startWord: 'like', endWord: 'rise', moves: 4, solution: ['like','life','wife','wise','rise'] },
  { id: 5,  date: '2026-03-18', startWord: 'fire', endWord: 'bare', moves: 4, solution: ['fire','hire','here','hare','bare'] },
  { id: 6,  date: '2026-03-19', startWord: 'hate', endWord: 'love', moves: 4, solution: ['hate','have','cave','cove','love'] },
  { id: 7,  date: '2026-03-20', startWord: 'cape', endWord: 'live', moves: 4, solution: ['cape','cave','cove','love','live'] },
  { id: 8,  date: '2026-03-21', startWord: 'time', endWord: 'find', moves: 4, solution: ['time','lime','line','fine','find'] },
  { id: 9,  date: '2026-03-22', startWord: 'mind', endWord: 'hill', moves: 4, solution: ['mind','mint','hint','hilt','hill'] },
  { id: 10, date: '2026-03-23', startWord: 'head', endWord: 'bead', moves: 4, solution: ['head','heal','real','read','bead'] },
  { id: 11, date: '2026-03-24', startWord: 'game', endWord: 'fast', moves: 4, solution: ['game','fame','face','fact','fast'] },
  { id: 12, date: '2026-03-25', startWord: 'take', endWord: 'hole', moves: 4, solution: ['take','tale','pale','pole','hole'] },
  { id: 13, date: '2026-03-26', startWord: 'note', endWord: 'robe', moves: 4, solution: ['note','nose','rose','rope','robe'] },
  { id: 14, date: '2026-03-27', startWord: 'star', endWord: 'shin', moves: 4, solution: ['star','spar','span','spin','shin'] },
  { id: 15, date: '2026-03-28', startWord: 'hand', endWord: 'food', moves: 4, solution: ['hand','band','bond','fond','food'] },
  { id: 16, date: '2026-03-29', startWord: 'ring', endWord: 'sill', moves: 4, solution: ['ring','rink','sink','silk','sill'] },
  { id: 17, date: '2026-03-30', startWord: 'bird', endWord: 'wild', moves: 4, solution: ['bird','bind','mind','mild','wild'] },
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
