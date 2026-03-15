import { getPuzzleForToday } from './puzzles.js';
import { buildDictionary } from './dictionary.js';
import { createGame } from './game.js';
import { initBoard, renderBoard, showError, showModal, hideModal, renderHeader, launchConfetti } from './ui.js';

async function init() {
  const puzzle = getPuzzleForToday();
  const dict = await buildDictionary(puzzle.startWord.length);
  const game = createGame(puzzle, (w) => dict.has(w.toLowerCase()));

  renderHeader(puzzle);
  const boardEl = document.getElementById('board');

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
