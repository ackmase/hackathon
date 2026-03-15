// Module-local state
let _container = null;
let _callbacks = null;
let _puzzle = null;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Initialize the board DOM. Must be called once on startup.
// container: HTMLElement (document.getElementById('board'))
// state: game state object from game.getState()
// callbacks: { onSubmit(word: string): void, onReset(): void, onShare(): void }
export function initBoard(container, state, callbacks) {
  _container = container;
  _callbacks = callbacks;
  _puzzle = state.puzzle;
  _renderSlots(state);
}

// Re-render the board in place after a state change.
// state: game state object from game.getState()
export function renderBoard(state) {
  if (!_container) return;
  _puzzle = state.puzzle;
  _renderSlots(state);
}

function _renderSlots(state) {
  const puzzle = state.puzzle;
  const chain = state.currentChain;

  // Clear previous content (but preserve error-msg if present)
  const existingError = _container.querySelector('.error-msg');
  _container.innerHTML = '';

  // Slot 0: locked start word
  const startSlot = document.createElement('div');
  startSlot.className = 'slot slot--locked slot--start';
  startSlot.textContent = puzzle.startWord.toUpperCase();
  _container.appendChild(startSlot);

  // Slots 1 through puzzle.moves - 1 (move slots)
  for (let i = 1; i <= puzzle.moves - 1; i++) {
    if (i < chain.length) {
      // Filled slot
      const slot = document.createElement('div');
      slot.className = 'slot slot--filled';
      slot.textContent = chain[i].toUpperCase();
      _container.appendChild(slot);
    } else if (i === chain.length) {
      // Active input slot
      const slot = document.createElement('div');
      slot.className = 'slot slot--active';

      const input = document.createElement('input');
      input.className = 'slot-input';
      input.type = 'text';
      input.maxLength = puzzle.startWord.length;
      input.autocomplete = 'off';
      input.spellcheck = false;

      input.addEventListener('input', () => {
        input.value = input.value.slice(0, puzzle.startWord.length).toLowerCase();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          _callbacks.onSubmit(input.value);
        }
      });

      slot.appendChild(input);
      _container.appendChild(slot);

      // Auto-focus
      requestAnimationFrame(() => input.focus());
    } else {
      // Pending slot
      const slot = document.createElement('div');
      slot.className = 'slot slot--pending';
      _container.appendChild(slot);
    }
  }

  // Last slot: locked end word
  const endSlot = document.createElement('div');
  endSlot.className = 'slot slot--locked slot--end';
  endSlot.textContent = puzzle.endWord.toUpperCase();
  _container.appendChild(endSlot);

  // Error message paragraph
  const errorP = document.createElement('p');
  errorP.className = 'error-msg';
  errorP.textContent = existingError ? existingError.textContent : '';
  _container.appendChild(errorP);
}

// Trigger the shake + error display on the active input slot.
// message: string — the error text to display below the board
export function showError(message) {
  if (!_container) return;

  // Show error message
  const errorP = _container.querySelector('.error-msg');
  if (errorP) errorP.textContent = message;

  // Shake the active slot
  const activeSlot = _container.querySelector('.slot--active');
  if (activeSlot) {
    activeSlot.classList.remove('slot--shake');
    // Trigger reflow to restart animation
    void activeSlot.offsetWidth;
    activeSlot.classList.add('slot--shake');
    activeSlot.addEventListener('animationend', () => {
      activeSlot.classList.remove('slot--shake');
    }, { once: true });

    // Clear the input
    const input = activeSlot.querySelector('.slot-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  }
}

// Launch a confetti burst animation over the page.
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const colors = ['#3b82f6', '#22c55e', '#fbbf24', '#f472b6', '#a78bfa'];
  const particles = [];
  let frame = 0;
  const EMIT_FRAMES = 60;
  const PER_FRAME = 2;
  let rafId;

  function spawnParticle() {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 2,
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 3,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frame < EMIT_FRAMES) {
      for (let i = 0; i < PER_FRAME; i++) spawnParticle();
      frame++;
    }

    const fadeStart = canvas.height * 0.7;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 0.15;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;

      if (p.y > fadeStart) {
        p.alpha = Math.max(0, 1 - (p.y - fadeStart) / (canvas.height * 0.3));
      }

      if (p.alpha <= 0 || p.y > canvas.height) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (particles.length > 0 || frame < EMIT_FRAMES) {
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
      canvas.remove();
    }
  }

  rafId = requestAnimationFrame(tick);
}

export { launchConfetti };

// Show the post-game modal.
// type: 'solved'
// state: game state object
// shareString: string — pre-built share string
// callbacks: { onShare(): void, onReset(): void }
export function showModal(type, state, shareString, callbacks) {
  // type is always 'solved'.
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = ''; // clear previous modal

  const modal = document.createElement('div');
  modal.className = 'modal modal--animated';

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

  const shareTextEl = modal.querySelector('.share-text');
  shareTextEl.addEventListener('click', () => {
    // Select all text
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(shareTextEl);
    sel.removeAllRanges();
    sel.addRange(range);

    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareString).catch(() => document.execCommand('copy'));
    } else {
      document.execCommand('copy');
    }

    // Flash animation
    shareTextEl.classList.remove('share-text--copied');
    void shareTextEl.offsetWidth;
    shareTextEl.classList.add('share-text--copied');
    shareTextEl.addEventListener('animationend', () => {
      shareTextEl.classList.remove('share-text--copied');
    }, { once: true });
  });

  document.getElementById('share-btn').addEventListener('click', callbacks.onShare);
  document.getElementById('retry-btn').addEventListener('click', callbacks.onReset);
}

// Hide any visible modal.
export function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// Render the header with puzzle id and move count.
export function renderHeader(puzzle) {
  const header = document.getElementById('header');
  if (!header) return;
  header.innerHTML = `
    <h1 class="title">SHIFT</h1>
    <div class="meta">#${puzzle.id} &nbsp;·&nbsp; ${puzzle.moves} moves</div>
  `;
}
