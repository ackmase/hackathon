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
