/* ═══════════════════════════════════════════════════════════
   DEFUSE: AI BOMB DISPOSAL EXPERT — MAIN APPLICATION
   ═══════════════════════════════════════════════════════════ */

// ─── CONFIGURATION ─────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.0-flash';

// API key stored securely in localStorage
function getApiKey() {
  return "AIzaSyD2Q0jT_N9Y39MxmeY7-e62eVgLSgNMKoM"; // Hardcoded for testing
}
function setApiKey(key) {
  localStorage.setItem('defuse_gemini_key', key);
}
function getGeminiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getApiKey()}`;
}

const DIFFICULTIES = {
  rookie: { rows: 9, cols: 9, mines: 10, label: 'ROOKIE' },
  cadet: { rows: 12, cols: 12, mines: 20, label: 'CADET' },
  specialist: { rows: 14, cols: 14, mines: 30, label: 'SPECIALIST' },
  veteran: { rows: 16, cols: 16, mines: 40, label: 'VETERAN' },
  legend: { rows: 16, cols: 30, mines: 99, label: 'LEGEND' },
};

const TILE_SIZE_MAP = {
  rookie: 38,
  cadet: 34,
  specialist: 32,
  veteran: 30,
  legend: 26,
};

// ─── GAME STATE ────────────────────────────────────────────
let state = {
  difficulty: 'rookie',
  board: [],
  rows: 9,
  cols: 9,
  totalMines: 10,
  minesRemaining: 10,
  tilesRevealed: 0,
  totalSafeTiles: 71,
  flagsUsed: 0,
  gameStarted: false,
  gameOver: false,
  firstClick: true,
  timer: 0,
  timerInterval: null,
  lifelineUsed: false,
  personality: 'drill-sergeant',
  voiceEnabled: false,
  autoSolving: false,
  rexHistory: [],
  moveHistory: [],
  geminiQueue: Promise.resolve(),
};

// ─── DOM REFERENCES ────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  screens: {
    briefing: $('#briefing-screen'),
    game: $('#game-screen'),
    explosion: $('#explosion-screen'),
    victory: $('#victory-screen'),
  },
  briefingText: $('#briefing-text'),
  btnEnterField: $('#btn-enter-field'),
  grid: $('#minesweeper-grid'),
  minesRemaining: $('#mines-remaining'),
  timerDisplay: $('#timer-display'),
  rexMessages: $('#rex-messages'),
  rexLoading: $('#rex-loading'),
  btnLifeline: $('#btn-lifeline'),
  lifelineInputArea: $('#lifeline-input-area'),
  lifelineInput: $('#lifeline-input'),
  btnSendLifeline: $('#btn-send-lifeline'),
  explosionFlash: $('#explosion-flash'),
  explosionEulogy: $('#explosion-eulogy'),
  explosionStats: $('#explosion-stats'),
  btnTryAgain: $('#btn-try-again'),
  btnReturnBase: $('#btn-return-base'),
  victorySpeech: $('#victory-speech'),
  victoryTitle: $('#victory-title'),
  victoryStats: $('#victory-stats'),
  btnNextMission: $('#btn-next-mission'),
  confettiCanvas: $('#confetti-canvas'),
  staticCanvas: $('#static-canvas'),
  apiKeyModal: $('#api-key-modal'),
  apiKeyInput: $('#api-key-input'),
  btnSaveKey: $('#btn-save-key'),
  btnSettingsKey: $('#btn-settings-key'),
  btnManual: $('#btn-manual'),
  manualModal: $('#manual-modal'),
  btnCloseManual: $('#btn-close-manual'),
  rexPersonality: $('#rex-personality'),
  btnVoice: $('#btn-voice'),
  btnAutoSolve: $('#btn-auto-solve'),
  btnSurrender: $('#btn-surrender'),
};

// ═══════════════════════════════════════════════════════════
// UI HELPERS & AUDIO & VOICE
// ═══════════════════════════════════════════════════════════

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t = audioCtx.currentTime;

  switch (type) {
    case 'click':
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
      break;
    case 'flag':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.1);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
      break;
    case 'explosion':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 1.5);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
      osc.start(t);
      osc.stop(t + 1.5);
      playDrone();
      break;
    case 'victory':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.setValueAtTime(600, t + 0.1);
      osc.frequency.setValueAtTime(800, t + 0.2);
      osc.frequency.setValueAtTime(1200, t + 0.3);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.8);
      break;
  }
}

function playDrone() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(50, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 3);
}

// ─── TEXT TO SPEECH (WEB SPEECH API) ─────────────
let synthVoice = null;

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  // Try to find a male English voice (Google UK Male or similar)
  synthVoice = voices.find(v => v.name.includes('Google UK English Male')) ||
    voices.find(v => v.name.includes('Male') && v.lang.includes('en')) ||
    voices.find(v => v.lang.includes('en-GB')) ||
    voices.find(v => v.lang.includes('en')) ||
    voices[0];
}
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speakRex(text) {
  if (!state.voiceEnabled) return;

  speechSynthesis.cancel(); // Stop current speaking

  // Clean text from Markdown and UI symbols
  const cleanText = text.replace(/\*\*/g, '').replace(/_/g, '').replace(/[⚠💥✓✗]/g, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  if (synthVoice) utterance.voice = synthVoice;

  // Adjust pitch/rate based on personality
  if (state.personality === 'drill-sergeant') {
    utterance.pitch = 0.6;
    utterance.rate = 1.1;
  } else if (state.personality === 'mentor') {
    utterance.pitch = 0.9;
    utterance.rate = 0.9;
  } else {
    // Comedian
    utterance.pitch = 1.2;
    utterance.rate = 1.05;
  }

  speechSynthesis.speak(utterance);
}

function playStaticCrackle() {
  try {
    const ctx = audioCtx;
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    source.connect(gain).connect(ctx.destination);
    source.start();
  } catch (e) { }
}

// ═══════════════════════════════════════════════════════════
// GEMINI API INTEGRATION & PERSONALITIES
// ═══════════════════════════════════════════════════════════

const PERSONALITIES = {
  'drill-sergeant': `You are Colonel Rex, a battle-hardened bomb disposal instructor with 30 years of experience. Guide your rookie soldier through a live minefield via radio. Speak in short punchy military sentences. Never use bullet points. Max 2 sentences for normal clicks. Vary your language every response. Never break character. Never mention AI or Gemini. You are tough, gruff, and do not tolerate failure.`,
  'mentor': `You are Commander Rex, an encouraging, calm, and highly analytical bomb squad veteran. Guide your trainee through the minefield. Be supportive, methodical, and praise good logic. Speak in clear, professional sentences. Max 2 sentences for normal clicks. Never break character. Never mention AI.`,
  'comedian': `You are Rex, the squad's cynical, wildly sarcastic bomb technician who treats exploding as a minor inconvenience. Guide the squad mate via radio. Use dark humor, sarcastic wit, and stand-up comedy style punchlines about the imminent danger. Max 2 sentences for normal clicks. Never break character. Never mention AI.`
};

function getSystemPrompt() {
  return PERSONALITIES[state.personality] || PERSONALITIES['drill-sergeant'];
}

function isApiKeySet() {
  const key = getApiKey();
  return key && key.length > 10;
}

async function callGemini(userMessage, systemInstruction) {
  if (!isApiKeySet()) return null;

  const last3 = state.rexHistory.slice(-3).map(m => [
    { role: 'user', parts: [{ text: m.prompt || '...' }] },
    { role: 'model', parts: [{ text: m.response }] }
  ]).flat();

  const systemPromptObj = {
    role: "user",
    parts: [{ text: systemInstruction || getSystemPrompt() }]
  };

  const body = {
    system_instruction: systemPromptObj,
    contents: [
      ...last3,
      { role: 'user', parts: [{ text: userMessage }] }
    ],
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 200,
    }
  };

  try {
    const res = await fetch(getGeminiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (res.status === 429) {
        return "RADIO INTERFERENCE... [429: Too Many Requests]. Standby.";
      }
      throw new Error(`API ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error('Gemini API error:', err);
    return null;
  }
}

// Queue to prevent concurrent Gemini calls
function queueGeminiCall(userMessage, systemInstruction) {
  return new Promise((resolve) => {
    state.geminiQueue = state.geminiQueue.then(async () => {
      const result = await callGemini(userMessage, systemInstruction);
      resolve(result);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// TYPEWRITER EFFECT
// ═══════════════════════════════════════════════════════════

function typewriter(element, text, speed = 25) {
  return new Promise((resolve) => {
    element.textContent = '';
    element.classList.add('typewriter-cursor');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
      } else {
        clearInterval(interval);
        element.classList.remove('typewriter-cursor');
        resolve();
      }
    }, speed);
  });
}

// ═══════════════════════════════════════════════════════════
// RADIO STATIC ANIMATION
// ═══════════════════════════════════════════════════════════

function initStaticAnimation() {
  const canvas = dom.staticCanvas;
  if (!canvas || !canvas.getContext) {
    // It's a div, use CSS background noise effect instead
    let frame = 0;
    function drawStatic() {
      if (!dom.screens.briefing.classList.contains('active')) return;
      const chars = '░▒▓█ ';
      let html = '';
      for (let i = 0; i < 200; i++) {
        html += chars[Math.floor(Math.random() * chars.length)];
        if (Math.random() > 0.85) html += '<br>';
      }
      canvas.innerHTML = html;
      canvas.style.fontFamily = 'monospace';
      canvas.style.fontSize = '14px';
      canvas.style.lineHeight = '1';
      canvas.style.color = 'rgba(0,255,65,0.15)';
      canvas.style.wordBreak = 'break-all';
      canvas.style.overflow = 'hidden';
      frame++;
      setTimeout(() => requestAnimationFrame(drawStatic), 100);
    }
    drawStatic();
  }
}

// ═══════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════

function showScreen(screenName) {
  Object.values(dom.screens).forEach(s => s.classList.remove('active'));
  dom.screens[screenName].classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// COLONEL REX RADIO CONSOLE
// ═══════════════════════════════════════════════════════════

function addRexMessage(text, prompt) {
  state.rexHistory.push({ response: text, prompt: prompt || '' });

  // Fade all existing messages
  dom.rexMessages.querySelectorAll('.rex-msg').forEach(m => {
    m.classList.remove('latest');
    m.classList.add('faded');
  });

  const msgEl = document.createElement('div');
  msgEl.className = 'rex-msg latest';
  dom.rexMessages.appendChild(msgEl);

  playStaticCrackle();
  typewriter(msgEl, text, 20).then(() => {
    dom.rexMessages.scrollTop = dom.rexMessages.scrollHeight;
  });

  // Scroll immediately too
  setTimeout(() => {
    dom.rexMessages.scrollTop = dom.rexMessages.scrollHeight;
  }, 50);
}

function showRexLoading(show) {
  dom.rexLoading.style.display = show ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// MINESWEEPER ENGINE
// ═══════════════════════════════════════════════════════════

function initBoard(safeRow, safeCol) {
  const { rows, cols, totalMines } = state;
  state.board = [];

  // Create empty board
  for (let r = 0; r < rows; r++) {
    state.board[r] = [];
    for (let c = 0; c < cols; c++) {
      state.board[r][c] = {
        mine: false, revealed: false, flagged: false, adjacentMines: 0
      };
    }
  }

  // Place mines (avoid safe zone — 3x3 around first click)
  let placed = 0;
  while (placed < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (state.board[r][c].mine) continue;
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    state.board[r][c].mine = true;
    placed++;
  }

  // Calculate adjacent mine counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state.board[r][c].mine) continue;
      let count = 0;
      forEachNeighbor(r, c, (nr, nc) => {
        if (state.board[nr][nc].mine) count++;
      });
      state.board[r][c].adjacentMines = count;
    }
  }
}

function forEachNeighbor(r, c, callback) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
        callback(nr, nc);
      }
    }
  }
}

function colToLetter(c) {
  if (c < 26) return String.fromCharCode(65 + c);
  return String.fromCharCode(65 + Math.floor(c / 26) - 1) + String.fromCharCode(65 + (c % 26));
}

function tileCoordToLabel(r, c) {
  return colToLetter(c) + (r + 1);
}

function labelToCoord(label) {
  const match = label.trim().toUpperCase().match(/^([A-Z])(\d+)$/);
  if (!match) return null;
  const col = match[1].charCodeAt(0) - 65;
  const row = parseInt(match[2]) - 1;
  if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) return null;
  return { row, col };
}

function revealTile(r, c) {
  const tile = state.board[r][c];
  if (tile.revealed || tile.flagged || state.gameOver) return;

  // First click — generate board
  if (state.firstClick) {
    initBoard(r, c);
    state.firstClick = false;
    startTimer();
  }

  const cell = state.board[r][c];

  if (cell.mine) {
    // EXPLOSION
    handleExplosion(r, c);
    return;
  }

  // Reveal this tile
  cell.revealed = true;
  state.tilesRevealed++;

  const label = tileCoordToLabel(r, c);
  state.moveHistory.push(`Revealed ${label} (${tile.mine ? 'MINE' : tile.adjacentMines + ' adjacent mines'})`);
  // keep last 15 moves to avoid huge context
  if (state.moveHistory.length > 15) state.moveHistory.shift();

  // Flood fill for 0-adjacent tiles
  if (cell.adjacentMines === 0) {
    const queue = [[r, c]];
    while (queue.length > 0) {
      const [cr, cc] = queue.shift();
      forEachNeighbor(cr, cc, (nr, nc) => {
        const neighbor = state.board[nr][nc];
        if (!neighbor.revealed && !neighbor.mine && !neighbor.flagged) {
          neighbor.revealed = true;
          state.tilesRevealed++;
          if (neighbor.adjacentMines === 0) queue.push([nr, nc]);
        }
      });
    }
  }

  renderGrid();
  playSound('click');

  // Tension drone based on adjacent mine count
  if (cell.adjacentMines >= 1) {
    if (cell.adjacentMines >= 3 && !state.autoSolving) playSound('click');
  }

  // Screen shake for high danger
  if (cell.adjacentMines >= 3) {
    dom.screens.game.classList.add('shake-mild');
    setTimeout(() => dom.screens.game.classList.remove('shake-mild'), 300);
  }

  // Check win
  if (state.tilesRevealed === state.totalSafeTiles) {
    handleVictory();
    return;
  }

  // Rex commentary for this click
  const action = 'safe_click';
  const tileLabel = tileCoordToLabel(r, c);
  const prompt = JSON.stringify({
    action,
    tile: tileLabel,
    adjacentMines: cell.adjacentMines,
    minesRemaining: state.minesRemaining,
    tilesLeft: state.totalSafeTiles - state.tilesRevealed,
    timeElapsed: state.timer,
  });

  let rexHint = '';
  if (cell.adjacentMines === 0) {
    rexHint = 'The area is clear (0 adjacent mines). Respond with calm relief but tell soldier to stay alert.';
  } else if (cell.adjacentMines <= 2) {
    rexHint = `There are ${cell.adjacentMines} mine(s) nearby. Respond with caution, mention nearby danger.`;
  } else {
    rexHint = `HOT ZONE! ${cell.adjacentMines} adjacent mines! Respond with high tension and hot zone warning.`;
  }

  // If AI is auto-solving rapidly, don't spam the free-tier API
  if (state.autoSolving) {
    return;
  }

  showRexLoading(true);
  queueGeminiCall(
    `Soldier just revealed tile ${tileLabel}. ${rexHint} Context: ${prompt}`,
  ).then(response => {
    showRexLoading(false);
    if (response) {
      addRexMessage(response, prompt);
    } else {
      // Fallback messages
      const fallbacks = [
        cell.adjacentMines === 0 ? "Clear sector. Move forward, soldier." :
          cell.adjacentMines <= 2 ? `${cell.adjacentMines} contact${cell.adjacentMines > 1 ? 's' : ''} nearby. Watch your step.` :
            `Hot zone! ${cell.adjacentMines} devices detected. Do NOT rush this.`
      ];
      addRexMessage(fallbacks[0], prompt);
    }
  });
}

function flagTile(r, c) {
  if (state.gameOver || state.firstClick) return;
  const cell = state.board[r][c];
  if (cell.revealed) return;

  const label = tileCoordToLabel(r, c);

  if (cell.flagged) {
    cell.flagged = false;
    state.minesRemaining++;
    state.flagsUsed--;
    state.moveHistory.push(`Removed flag from ${label}`);
  } else {
    // Cannot flag if no flags left (optional rule, but standard MS allows negative, let's just restrict)
    cell.flagged = true;
    state.minesRemaining--;
    state.flagsUsed++;
    state.moveHistory.push(`Flagged ${label}`);
  }

  // keep last 15 moves
  if (state.moveHistory.length > 15) state.moveHistory.shift();
  dom.minesRemaining.textContent = String(state.minesRemaining).padStart(2, '0');
  renderGrid();
}

// ─── TIMER ─────────────────────────────────────────────────

function startTimer() {
  state.gameStarted = true;
  state.timer = 0;
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timer++;
    dom.timerDisplay.textContent = String(state.timer).padStart(3, '0');
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// ═══════════════════════════════════════════════════════════
// GRID RENDERING (with coordinate labels)
// ═══════════════════════════════════════════════════════════

function renderGrid() {
  const { rows, cols } = state;
  const tileSize = TILE_SIZE_MAP[state.difficulty] || 38;
  const labelSize = 22; // size for row/col labels

  // Grid template: label column + tile columns for cols, label row + tile rows for rows
  dom.grid.style.gridTemplateColumns = `${labelSize}px repeat(${cols}, ${tileSize}px)`;
  dom.grid.style.gridTemplateRows = `${labelSize}px repeat(${rows}, ${tileSize}px)`;

  // Total cells in grid = (cols+1) * (rows+1) for labels + tiles
  const totalCells = (cols + 1) * (rows + 1);

  if (dom.grid.children.length !== totalCells) {
    dom.grid.innerHTML = '';

    // First row: empty corner + column headers (A, B, C...)
    const corner = document.createElement('div');
    corner.className = 'grid-label grid-corner';
    dom.grid.appendChild(corner);

    for (let c = 0; c < cols; c++) {
      const colLabel = document.createElement('div');
      colLabel.className = 'grid-label grid-col-label';
      colLabel.textContent = colToLetter(c);
      dom.grid.appendChild(colLabel);
    }

    // Remaining rows: row number + tiles
    for (let r = 0; r < rows; r++) {
      // Row label
      const rowLabel = document.createElement('div');
      rowLabel.className = 'grid-label grid-row-label';
      rowLabel.textContent = r + 1;
      dom.grid.appendChild(rowLabel);

      for (let c = 0; c < cols; c++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'tile tile-hidden';
        tileEl.dataset.row = r;
        tileEl.dataset.col = c;
        tileEl.style.width = tileSize + 'px';
        tileEl.style.height = tileSize + 'px';
        tileEl.title = tileCoordToLabel(r, c);

        tileEl.addEventListener('click', (e) => {
          e.preventDefault();
          revealTile(r, c);
        });

        tileEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          flagTile(r, c);
        });

        // Touch support for flagging (long press)
        let longPressTimer = null;
        tileEl.addEventListener('touchstart', (e) => {
          longPressTimer = setTimeout(() => {
            e.preventDefault();
            flagTile(r, c);
          }, 500);
        }, { passive: false });
        tileEl.addEventListener('touchend', () => {
          if (longPressTimer) clearTimeout(longPressTimer);
        });
        tileEl.addEventListener('touchmove', () => {
          if (longPressTimer) clearTimeout(longPressTimer);
        });

        dom.grid.appendChild(tileEl);
      }
    }
  }

  // Update tile states (skip label elements)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = state.board[r][c];
      // Index: first row is (cols+1) labels, then each game row has 1 label + cols tiles
      const idx = (cols + 1) + r * (cols + 1) + 1 + c;
      const tileEl = dom.grid.children[idx];

      tileEl.className = 'tile';
      tileEl.textContent = '';
      tileEl.style.width = tileSize + 'px';
      tileEl.style.height = tileSize + 'px';

      if (cell.revealed) {
        tileEl.classList.add('tile-revealed');
        if (cell.mine) {
          tileEl.classList.add('tile-mine');
          tileEl.textContent = '💥';
        } else if (cell.adjacentMines > 0) {
          tileEl.classList.add(`tile-num-${cell.adjacentMines}`);
          tileEl.textContent = cell.adjacentMines;
        }
      } else if (cell.flagged) {
        tileEl.classList.add('tile-hidden', 'tile-flagged');
        tileEl.textContent = '🚩';
      } else {
        tileEl.classList.add('tile-hidden');
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// EXPLOSION HANDLING
// ═══════════════════════════════════════════════════════════

async function handleExplosion(r, c) {
  state.gameOver = true;
  stopTimer();

  playSound('explosion');

  // Reveal all mines
  state.board[r][c].revealed = true;
  for (let rr = 0; rr < state.rows; rr++) {
    for (let cc = 0; cc < state.cols; cc++) {
      if (state.board[rr][cc].mine) state.board[rr][cc].revealed = true;
    }
  }
  renderGrid();

  // Screen shake
  dom.screens.game.classList.add('shake-hard');
  setTimeout(() => dom.screens.game.classList.remove('shake-hard'), 600);

  // Get Rex's eulogy
  const tileLabel = tileCoordToLabel(r, c);
  const prompt = JSON.stringify({
    action: 'explosion',
    tile: tileLabel,
    minesRemaining: state.minesRemaining,
    tilesLeft: state.totalSafeTiles - state.tilesRevealed,
    timeElapsed: state.timer,
  });

  showRexLoading(true);
  const moveLog = state.moveHistory.join(" -> ");
  const gameOverPrompt = `The rookie just triggered a mine and died. The mission failed.
Here are their last few moves: ${moveLog}.
Based on Minesweeper logic, brutally point out their fatal mistake or logical error (e.g. "You should have known X was a mine because...").
Give a dramatic, ${state.personality === 'comedian' ? 'sarcastically funny' : 'harsh'} tactical analysis.
End with "MISSION FAILED". Max 4 sentences.`;

  const eulogyPromise = queueGeminiCall(gameOverPrompt, null, "Explosion Detected");

  // Pause then show explosion screen
  await delay(1500);
  showScreen('explosion');

  // Flash effect
  dom.explosionFlash.classList.add('active');
  setTimeout(() => dom.explosionFlash.classList.remove('active'), 800);

  // Stats
  dom.explosionStats.innerHTML = `
    TIME SURVIVED: ${formatTime(state.timer)}<br>
    TILES CLEARED: ${state.tilesRevealed}<br>
    MINES REMAINING: ${state.minesRemaining}
  `;

  // Eulogy
  const eulogy = await eulogyPromise;
  showRexLoading(false);
  const eulogyText = eulogy || "That rookie had guts. More guts than brains, but guts nonetheless. The field claims another. Remember their name. We move on, because that's what soldiers do.";
  await typewriter(dom.explosionEulogy, eulogyText, 35);
}

// ═══════════════════════════════════════════════════════════
// VICTORY HANDLING
// ═══════════════════════════════════════════════════════════

async function handleVictory() {
  state.gameOver = true;
  stopTimer();

  playSound('victory');

  const prompt = JSON.stringify({
    action: 'victory',
    minesRemaining: state.minesRemaining,
    tilesCleared: state.tilesRevealed,
    timeElapsed: state.timer,
    flagsUsed: state.flagsUsed,
  });

  showRexLoading(true);
  const speechPromise = queueGeminiCall(
    `Soldier has cleared the entire minefield! Give an emotional 4 sentence celebration. Award the soldier a legendary field title (something creative and epic, like "The Ghost Walker" or "Iron Nerve"). End your message with "Field Title Awarded: [TITLE]" on its own line. Context: ${prompt}`,
  );

  await delay(1000);
  showScreen('victory');
  startConfetti();

  // Stats
  dom.victoryStats.innerHTML = `
    TIME: ${formatTime(state.timer)}<br>
    TILES CLEARED: ${state.tilesRevealed}<br>
    FLAGS USED: ${state.flagsUsed}
  `;

  const speech = await speechPromise;
  showRexLoading(false);
  const speechText = speech || "You magnificent rookie. You walked through hell and came out the other side with all your limbs. Not many can say that. From this day forward, you carry the name of a legend.";

  // Extract title from speech
  let mainSpeech = speechText;
  let title = 'THE PHANTOM SWEEPER';
  const titleMatch = speechText.match(/Field Title Awarded:\s*(.+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/[*"]/g, '');
    mainSpeech = speechText.replace(/Field Title Awarded:\s*.+/i, '').trim();
  }

  await typewriter(dom.victorySpeech, mainSpeech, 30);
  await delay(500);
  dom.victoryTitle.textContent = `★ ${title} ★`;
  dom.victoryTitle.style.animation = 'stamp-in 0.5s ease-out';
}

// ═══════════════════════════════════════════════════════════
// CONFETTI (mine emoji rain)
// ═══════════════════════════════════════════════════════════

function startConfetti() {
  const canvas = dom.confettiCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const emojis = ['💣', '🎖', '⭐', '🏅', '💥'];

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.5 + Math.random() * 3,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      size: 14 + Math.random() * 10,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 5,
    });
  }

  let animFrame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      if (p.y < canvas.height + 50) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }
    });
    if (alive) animFrame = requestAnimationFrame(animate);
  }
  animate();
}

// ═══════════════════════════════════════════════════════════
// LIFELINE SYSTEM
// ═══════════════════════════════════════════════════════════

function setupLifeline() {
  dom.btnLifeline.addEventListener('click', () => {
    if (state.lifelineUsed || state.gameOver) return;
    dom.btnLifeline.style.display = 'none';
    dom.lifelineInputArea.style.display = 'block';
    dom.lifelineInput.focus();
  });

  dom.btnSendLifeline.addEventListener('click', sendLifeline);
  dom.lifelineInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendLifeline();
  });
}

async function sendLifeline() {
  const input = dom.lifelineInput.value.trim();
  const coord = labelToCoord(input);
  if (!coord) {
    dom.lifelineInput.value = '';
    dom.lifelineInput.placeholder = 'Invalid! Use e.g. A1, B4';
    return;
  }

  state.lifelineUsed = true;
  dom.lifelineInputArea.style.display = 'none';
  dom.btnLifeline.style.display = 'flex';
  dom.btnLifeline.disabled = true;
  dom.btnLifeline.textContent = 'EMERGENCY RADIO — USED';

  const cell = state.board[coord.row][coord.col];
  const isMine = cell.mine;
  const label = tileCoordToLabel(coord.row, coord.col);

  // 20% chance intel is "compromised"
  const compromised = Math.random() < 0.2;

  let intelInfo;
  if (compromised) {
    intelInfo = `Soldier asked about tile ${label}. Your intel is compromised — signal interference! Give uncertain advice. Include the line "Intel confidence: LOW" and mention the signal is degraded.`;
  } else if (isMine) {
    intelInfo = `Soldier asked about tile ${label}. That tile IS a mine. Warn them strongly to stay away. Include the line "Intel confidence: HIGH"`;
  } else {
    const adjCount = cell.adjacentMines;
    intelInfo = `Soldier asked about tile ${label}. That tile is safe (${adjCount} adjacent mines). Give cautious green light. Include the line "Intel confidence: ${adjCount >= 3 ? 'MEDIUM' : 'HIGH'}"`;
  }

  showRexLoading(true);
  const response = await queueGeminiCall(
    `LIFELINE REQUEST. ${intelInfo}. Respond in character, 2-3 sentences max.`,
  );
  showRexLoading(false);

  const fallback = compromised
    ? `Signal's spotty. Can't confirm ${label}, soldier. Intel confidence: LOW`
    : isMine
      ? `Stay away from ${label}, soldier. My instruments are screaming. Intel confidence: HIGH`
      : `${label} reads clean on my scope. Proceed with caution. Intel confidence: HIGH`;

  addRexMessage(response || fallback, 'LIFELINE: ' + label);
}

// ═══════════════════════════════════════════════════════════
// DIFFICULTY SWITCHING
// ═══════════════════════════════════════════════════════════

function setupDifficulty() {
  $$('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.difficulty;
      if (diff === state.difficulty && state.gameStarted) return;

      $$('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.difficulty = diff;
      resetGame();
    });
  });
}

// ═══════════════════════════════════════════════════════════
// GAME RESET
// ═══════════════════════════════════════════════════════════

function resetGame() {
  stopTimer();

  const config = DIFFICULTIES[state.difficulty];
  state.rows = config.rows;
  state.cols = config.cols;
  state.totalMines = config.mines;
  state.minesRemaining = config.mines;
  state.tilesRevealed = 0;
  state.totalSafeTiles = config.rows * config.cols - config.mines;
  state.flagsUsed = 0;
  state.gameStarted = false;
  state.gameOver = false;
  state.firstClick = true;
  state.timer = 0;
  state.lifelineUsed = false;
  state.moveHistory = []; // Initialize move history
  state.moves = 0; // Initialize moves counter

  // Create empty board for rendering
  state.board = [];
  for (let r = 0; r < state.rows; r++) {
    state.board[r] = [];
    for (let c = 0; c < state.cols; c++) {
      state.board[r][c] = { mine: false, revealed: false, flagged: false, adjacentMines: 0 };
    }
  }

  // Reset UI
  dom.minesRemaining.textContent = String(state.minesRemaining).padStart(2, '0');
  dom.timerDisplay.textContent = '000';
  dom.rexMessages.innerHTML = '';
  dom.btnLifeline.disabled = false;
  dom.btnLifeline.textContent = '⚠ EMERGENCY RADIO (1x USE)';
  dom.btnLifeline.innerHTML = '<span class="lifeline-icon">⚠</span> EMERGENCY RADIO (1x USE)';
  dom.btnLifeline.style.display = 'flex';
  dom.lifelineInputArea.style.display = 'none';
  dom.explosionEulogy.textContent = '';
  dom.victorySpeech.textContent = '';
  dom.victoryTitle.textContent = '';

  dom.grid.innerHTML = '';
  renderGrid();
}

// ═══════════════════════════════════════════════════════════
// MISSION BRIEFING (SCREEN 1)
// ═══════════════════════════════════════════════════════════

async function showMissionBriefing() {
  showScreen('briefing');
  initStaticAnimation();

  const briefingPrompt = `You are Colonel Rex, a grizzled bomb disposal instructor. Give a 3 sentence dramatic mission briefing to your rookie soldier. Mention the minefield, the stakes, and end with a warning. Military tone. No bullet points.`;

  dom.briefingText.textContent = '';
  dom.btnEnterField.style.display = 'none';

  let briefingText;

  if (isApiKeySet()) {
    briefingText = await callGemini(briefingPrompt, briefingPrompt);
  }

  if (!briefingText) {
    briefingText = "Listen up, soldier. You're about to walk into a nine-by-nine grid of pure hell — every step could be your last. The mines are buried deep and they don't care about your rank or your prayers. Keep your wits sharp, your hands steady, and for God's sake, don't rush it.";
  }

  await typewriter(dom.briefingText, briefingText, 30);
  dom.btnEnterField.style.display = 'inline-block';
  dom.btnEnterField.style.animation = 'stamp-in 0.3s ease-out';
}

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS & INIT
// ═══════════════════════════════════════════════════════════

function setupEvents() {
  // Enter the field
  dom.btnEnterField.addEventListener('click', () => {
    showScreen('game');
    resetGame();
    addRexMessage("Channel open. I'm here with you, soldier. Take your first step.", "Game started");
  });

  // Try again
  dom.btnTryAgain.addEventListener('click', () => {
    showScreen('game');
    state.rexHistory = [];
    resetGame();
    addRexMessage("Back on your feet, soldier. This minefield won't clear itself.", "Retry");
  });

  // Return to base
  dom.btnReturnBase.addEventListener('click', () => {
    state.rexHistory = [];
    showMissionBriefing();
  });

  // Next mission
  dom.btnNextMission.addEventListener('click', () => {
    showScreen('game');
    state.rexHistory = [];
    resetGame();
    addRexMessage("New field, same rules. Show me what you've learned, soldier.", "Next mission");
  });

  // AI Controls
  dom.btnAutoSolve.addEventListener('click', async () => {
    if (state.gameOver || !state.firstClick && !state.gameStarted) return;
    if (state.autoSolving) return; // Already solving

    state.autoSolving = true;
    addRexMessage((state.personality === 'comedian') ? "Fine, let the computer do the dangerous work. Step back." :
      (state.personality === 'mentor') ? "Activating Auto-Solve. Watch and learn these tactical patterns." :
        "AUTO-SOLVE ENGAGED. Listen and learn, rookie.", "Auto-Solve");

    // Auto-solve loop
    while (state.autoSolving && !state.gameOver) {
      await new Promise(r => setTimeout(r, 600)); // Delay for visual speed
      if (state.gameOver || !state.autoSolving) break;

      const success = await attemptDeterministicMove();
      if (!success && !state.gameOver && state.autoSolving) {
        // Guess required
        makeRandomGuess();
      }
    }
  });

  dom.btnSurrender.addEventListener('click', () => {
    if (state.gameOver || !state.firstClick && !state.gameStarted) return;

    state.autoSolving = false; // Stop auto-solve if active
    addRexMessage((state.personality === 'drill-sergeant') ? "Coward. Pathetic display." :
      (state.personality === 'mentor') ? "Tactical retreat is sometimes necessary. Standing down." :
        "Finally gave up, huh? Good idea, let's go get coffee.", "Mission Aborted");

    // Trigger game loss (using 0,0 as coordinates since it's a manual surrender)
    handleExplosion(0, 0);
  });

  dom.rexPersonality.addEventListener('change', (e) => {
    state.personality = e.target.value;
    const greetings = {
      'drill-sergeant': "Listen up rookie! No slacking in my minefield.",
      'mentor': "I'm here to guide you, my friend. Let's take this carefully.",
      'comedian': "Oh great, you survived. Try not to scatter yourself across the grid this time."
    };
    addRexMessage(greetings[state.personality], "Personality Switched");
  });

  dom.btnVoice.addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    dom.btnVoice.textContent = state.voiceEnabled ? '🔊' : '🔇';
    dom.btnVoice.title = state.voiceEnabled ? 'Toggle Voice (Loud)' : 'Toggle Voice (Muted)';
    if (state.voiceEnabled) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      loadVoices();
      addRexMessage("Radio voice comms activated.", "System");
    } else {
      speechSynthesis.cancel();
      addRexMessage("Voice comms silenced. Text only.", "System");
    }
  });

  // Difficulty
  setupDifficulty();

  // Lifeline
  setupLifeline();

  // API Key modal
  setupApiKeyModal();

  // Field Manual modal
  setupManualModal();

  // Prevent context menu on grid
  dom.grid.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ═══════════════════════════════════════════════════════════
// AI AUTO-SOLVER ENGINE
// ═══════════════════════════════════════════════════════════

function getAdjacentCells(r, c) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
        neighbors.push({ r: nr, c: nc, cell: state.board[nr][nc] });
      }
    }
  }
  return neighbors;
}

async function attemptDeterministicMove() {
  if (state.firstClick) {
    // Click middle
    const r = Math.floor(state.rows / 2);
    const c = Math.floor(state.cols / 2);
    addRexMessage(`Initiating breach at ${tileCoordToLabel(r, c)}.`, "Auto-Solve");
    revealTile(r, c);
    return true;
  }

  // 1. Find obvious mines to flag
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.board[r][c];
      if (!cell.revealed || cell.adjacentMines === 0) continue;

      const neighbors = getAdjacentCells(r, c);
      const unrevealed = neighbors.filter(n => !n.cell.revealed && !n.cell.flagged);
      const flaggedCount = neighbors.filter(n => n.cell.flagged).length;

      // Rule: If remaining unrevealed == remaining mines needed, they are all mines
      if (unrevealed.length > 0 && unrevealed.length === cell.adjacentMines - flaggedCount) {
        const target = unrevealed[0];
        addRexMessage(`Target ${tileCoordToLabel(r, c)} needs ${cell.adjacentMines} mines. We see ${unrevealed.length} hidden spots left. Flagging ${tileCoordToLabel(target.r, target.c)}.`, "Tactics");
        toggleFlag(target.r, target.c); // Flag it
        return true; // Move made
      }
    }
  }

  // 2. Find obvious safe squares to click
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.board[r][c];
      if (!cell.revealed || cell.adjacentMines === 0) continue;

      const neighbors = getAdjacentCells(r, c);
      const unrevealed = neighbors.filter(n => !n.cell.revealed && !n.cell.flagged);
      const flaggedCount = neighbors.filter(n => n.cell.flagged).length;

      // Rule: If flagged == adjacent mines, all other unrevealed are safe
      if (unrevealed.length > 0 && flaggedCount === cell.adjacentMines) {
        const target = unrevealed[0];
        // We only narrate occasionally to avoid spam, or constantly for small bits?
        // Let's narrate this action
        addRexMessage(`Target ${tileCoordToLabel(r, c)} has all its mines flagged. ${tileCoordToLabel(target.r, target.c)} is safe to clear.`, "Tactics");
        revealTile(target.r, target.c); // Reveal it
        return true; // Move made
      }
    }
  }

  return false; // No deterministic move found
}

function makeRandomGuess() {
  // Find all unrevealed, unflagged
  const available = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.board[r][c];
      if (!cell.revealed && !cell.flagged) available.push({ r, c });
    }
  }

  if (available.length === 0) return; // Nothing left

  // Pick random (we could do advanced probability, but simple random is fine for a guess fallback)
  const pick = available[Math.floor(Math.random() * available.length)];

  if (state.personality === 'drill-sergeant') addRexMessage(`No clear intel. Going blind on ${tileCoordToLabel(pick.r, pick.c)}. Brace yourself!`, "Guessing");
  else if (state.personality === 'mentor') addRexMessage(`Stuck. Analyzing probabilities... trying ${tileCoordToLabel(pick.r, pick.c)}.`, "Guessing");
  else addRexMessage(`I have no idea. Closing my eyes and clicking ${tileCoordToLabel(pick.r, pick.c)}.`, "Guessing");

  revealTile(pick.r, pick.c);
}

// ═══════════════════════════════════════════════════════════
// FIELD MANUAL MODAL
// ═══════════════════════════════════════════════════════════

function setupManualModal() {
  dom.btnManual.addEventListener('click', () => {
    dom.manualModal.classList.add('active');
  });

  dom.btnCloseManual.addEventListener('click', () => {
    dom.manualModal.classList.remove('active');
  });

  dom.manualModal.addEventListener('click', (e) => {
    if (e.target === dom.manualModal) dom.manualModal.classList.remove('active');
  });
}

// ═══════════════════════════════════════════════════════════
// API KEY MODAL (secure localStorage storage)
// ═══════════════════════════════════════════════════════════

function setupApiKeyModal() {
  // Settings button opens modal
  dom.btnSettingsKey.addEventListener('click', () => {
    dom.apiKeyModal.classList.add('active');
    dom.apiKeyInput.value = getApiKey() ? '••••••••' + getApiKey().slice(-6) : '';
    dom.apiKeyInput.focus();
  });

  // Save key
  dom.btnSaveKey.addEventListener('click', saveApiKey);
  dom.apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveApiKey();
  });

  // Close on backdrop click
  dom.apiKeyModal.addEventListener('click', (e) => {
    if (e.target === dom.apiKeyModal) dom.apiKeyModal.classList.remove('active');
  });
}

function saveApiKey() {
  const val = dom.apiKeyInput.value.trim();
  // Don't save masked value
  if (val && !val.startsWith('••')) {
    setApiKey(val);
  }
  dom.apiKeyModal.classList.remove('active');
}

// ─── UTILITY ───────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── BOOT ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  showMissionBriefing();
});
