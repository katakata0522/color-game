// 色覚タイプの説明（ツールチップ）
const cbTypeTips = {
  normal: `<b>標準（一般的な色覚）</b><br>最も多い色の感じ方。` ,
  protanopia: `<b>1型（赤系の識別が弱い傾向）</b><br>赤の識別が難しくなる場合があります。`,
  deuteranopia: `<b>2型（緑系の識別が弱い傾向）</b><br>緑の識別が難しくなる場合があります。`,
  tritanopia: `<b>3型（青系の識別が弱い傾向）</b><br>青の識別が難しくなる場合があります。`
};

// 色覚シミュレーション（簡易マトリクス）
const colorBlindMatrices = {
  normal:      [[1, 0, 0],[0, 1, 0],[0, 0, 1]],
  protanopia:  [[0.56667, 0.43333, 0],[0.55833, 0.44167, 0],[0, 0.24167, 0.75833]],
  deuteranopia:[[0.625, 0.375, 0],[0.7, 0.3, 0],[0, 0.3, 0.7]],
  tritanopia:  [[0.95, 0.05, 0],[0, 0.43333, 0.56667],[0, 0.475, 0.525]],
};

let currentCBType = 'normal';
let highlightExperienceMode = false; // 初期OFF

document.addEventListener('DOMContentLoaded', () => {
  const GAME_SETTINGS = {
    INITIAL_LIVES: 3,
    NUM_PANELS: 25,
    GRID_SIZE: 5,
    RESULT_DISPLAY_DELAY: 1000,
    SCORE_PER_CORRECT: 100,
    TIMER_DURATION_PER_QUESTION: 9000, // ms
    MAX_QUESTIONS: 15,
  };

  const colorBlindnessTestStages = [
    { base: '#FF4444', diff: '#44FF44' }, // 赤-緑
    { base: '#FFFF44', diff: '#44FF44' }, // 黄-緑
    { base: '#FF99BB', diff: '#BBBBBB' }, // ピンク-灰
  ];

  // DOM参照
  const gameBoard = document.getElementById('game-board');
  const startBtn = document.getElementById('start-btn');
  const resetBtn = document.getElementById('reset-btn');
  const resultMessage = document.getElementById('result-message');
  const questionNumberDisplay = document.getElementById('question-number');
  const scoreDisplay = document.getElementById('score');
  const heartsContainer = document.getElementById('hearts');
  const timerDisplay = document.getElementById('timer');
  const adviceMessage = document.getElementById('advice-message');
  const bodyElement = document.body;
  const containerElement = document.querySelector('.container');
  const cbModeSwitcher = document.getElementById('cb-mode-switcher');
  const cbTooltip = document.getElementById('cb-tooltip');
  const cbButtons = cbModeSwitcher.querySelectorAll('button[data-type]');
  const highlightBtn = document.getElementById('highlight-btn');

  // ゲーム状態
  let gameActive = false;
  let currentQuestion = 1;
  let score = 0;
  let lives = GAME_SETTINGS.INITIAL_LIVES;
  let targetIndex = -1;
  let rafId = null;
  let timerStart = 0;
  let duration = 0;
  let colorBlindFlag = false;
  let gameStartTime = 0;
  let gameEndTime = 0;
  let currentPanels = [];

  // 色覚タイプUI
  cbButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      cbButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentCBType = btn.getAttribute('data-type');
      showTooltip(currentCBType);
      redrawPanels();
    });
    btn.addEventListener('mouseenter', () => showTooltip(btn.getAttribute('data-type')));
    btn.addEventListener('mouseleave', () => showTooltip(currentCBType));
  });
  showTooltip(currentCBType);

  function showTooltip(type) {
    cbTooltip.innerHTML = cbTypeTips[type] || '';
  }

  // ハイライト体験 ON/OFF
  highlightBtn.addEventListener('click', () => {
    highlightExperienceMode = !highlightExperienceMode;
    highlightBtn.textContent = highlightExperienceMode ? 'ON' : 'OFF';
    highlightBtn.classList.toggle('active', highlightExperienceMode);
    highlightBtn.setAttribute('aria-pressed', highlightExperienceMode ? 'true' : 'false');
    redrawPanels();
  });

  // 基本イベント
  startBtn.addEventListener('click', startGame);
  resetBtn.addEventListener('click', resetGame);
  gameBoard.addEventListener('click', handleBoardClick);
  gameBoard.addEventListener('keydown', handleBoardKeyDown);

  initializeGameUI();

  function initializeGameUI() {
    currentQuestion = 1; score = 0; lives = GAME_SETTINGS.INITIAL_LIVES; colorBlindFlag = false; gameActive = false;
    renderHearts(); updateQuestionDisplay(); scoreDisplay.textContent = score; timerDisplay.textContent = (GAME_SETTINGS.TIMER_DURATION_PER_QUESTION/1000).toFixed(1);
    startBtn.classList.remove('hidden'); resetBtn.classList.add('hidden'); hideResult(); hideAdvice(); gameBoard.innerHTML = '';
    bodyElement.classList.remove('game-cleared'); containerElement.classList.remove('game-cleared'); resultMessage.classList.remove('cleared');
    disablePanelInteraction(); currentPanels = []; redrawPanels();
  }

  function startGame() {
    if (gameActive) return;
    gameActive = true; score = 0; lives = GAME_SETTINGS.INITIAL_LIVES; currentQuestion = 1; colorBlindFlag = false; gameStartTime = Date.now();
    updateQuestionDisplay(); scoreDisplay.textContent = score; renderHearts(); hideResult(); hideAdvice();
    startBtn.classList.add('hidden'); resetBtn.classList.remove('hidden'); setupQuestion();
  }

  function resetGame() { stopTimer(); initializeGameUI(); }

  function renderHearts() {
    heartsContainer.innerHTML = '';
    const heartSVG = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const brokenHeartSVG = `<svg class="broken" viewBox="0 0 24 24"><path d="M13.45 3.13l-.2.23-.2-.23C12.46 2.52 11.76 2 11 2c-1.74 0-3.41.81-4.5 2.09C5.41 5.19 5 6.3 5 7.5c0 2.12 1.64 4.15 4.18 6.51l.47.43-.65.65-3.05-2.73c-1.04-.94-2.08-2-2.08-3.36 0-1.54 1.13-2.84 2.62-3.16.8-.18 1.63-.01 2.38.51L9.5 5.5l1.5-1.5-1.1-1.1c.6-.5 1.3-.7 2.1-.7.76 0 1.46.29 2.05.88l.2.23zM19.5 3c-1.74 0-3.41.81-4.5 2.09l-1.1 1.1 1.5 1.5L16 6.5l.38-.38c.75-.52 1.58-.69 2.38-.51 1.49.32 2.62 1.62 2.62 3.16 0 1.36-1.04 2.42-2.08 3.36l-3.05 2.73.65.65.47-.43C17.36 11.65 19 9.62 19 7.5c0-1.2-.41-2.31-1.5-3.41z"/></svg>`;
    for (let i = 0; i < lives; i++) {
      const span = document.createElement('span'); span.innerHTML = heartSVG; heartsContainer.appendChild(span);
    }
    if (lives === 0) { const span = document.createElement('span'); span.innerHTML = brokenHeartSVG; heartsContainer.appendChild(span); }
  }

  function updateQuestionDisplay() { questionNumberDisplay.textContent = `${currentQuestion}/${GAME_SETTINGS.MAX_QUESTIONS}`; }

  function setupQuestion() {
    if (lives <= 0) { gameOver(); return; }
    if (currentQuestion > GAME_SETTINGS.MAX_QUESTIONS) { gameClear(); return; }

    updateQuestionDisplay(); gameBoard.innerHTML = ''; hideResult(); hideAdvice();

    let baseColor, diffColor, difficulty;
    if (currentQuestion <= colorBlindnessTestStages.length) {
      baseColor = colorBlindnessTestStages[currentQuestion - 1].base;
      diffColor = colorBlindnessTestStages[currentQuestion - 1].diff;
    } else if (currentQuestion <= 10) {
      difficulty = 60 - (currentQuestion - 4) * 5; // 少しずつ難しく
      baseColor = generateRandomColor();
      diffColor = generateSlightlyDifferentColor(baseColor, difficulty);
    } else {
      const hardDiffs = [14, 12, 10, 8, 6];
      difficulty = hardDiffs[currentQuestion - 11];
      baseColor = generateRandomColor();
      diffColor = generateSlightlyDifferentColor(baseColor, difficulty);
    }

    targetIndex = Math.floor(Math.random() * GAME_SETTINGS.NUM_PANELS);
    currentPanels = [];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < GAME_SETTINGS.NUM_PANELS; i++) {
      const rawColor = (i === targetIndex) ? diffColor : baseColor;
      currentPanels.push({ index: i, rawColor, isTarget: i === targetIndex });
      const displayColor = getPanelDisplayColor(rawColor, i, currentQuestion <= 3);
      const panel = document.createElement('div');
      panel.classList.add('panel'); panel.style.backgroundColor = displayColor;
      panel.dataset.target = (i === targetIndex) ? 'true' : 'false';
      panel.setAttribute('role', 'button'); panel.setAttribute('tabindex', '0');
      fragment.appendChild(panel);
    }
    gameBoard.appendChild(fragment);
    enablePanelInteraction();
    startTimer(GAME_SETTINGS.TIMER_DURATION_PER_QUESTION);
  }

  // 1〜3問目のハイライト体験
  function getPanelDisplayColor(rawColor, index, isColorBlindTestStage) {
    if (highlightExperienceMode && isColorBlindTestStage) {
      if (currentCBType === 'protanopia' && currentQuestion === 1) return '#828d82'; // 見分けやすく
      if (currentCBType === 'deuteranopia' && currentQuestion === 2) return '#7d907d';
      if (currentCBType === 'tritanopia' && currentQuestion === 3) return '#bdbdbd';
    }
    const rgb = cssToRgb(rawColor);
    return rgbToCss(applyColorBlindness(rgb, currentCBType));
  }

  function redrawPanels() {
    if (!currentPanels || currentPanels.length === 0) return;
    const panelEls = Array.from(gameBoard.querySelectorAll('.panel'));
    currentPanels.forEach((panelInfo, idx) => {
      if (panelEls[idx]) {
        const displayColor = getPanelDisplayColor(panelInfo.rawColor, idx, currentQuestion <= 3);
        panelEls[idx].style.backgroundColor = displayColor;
      }
    });
  }

  // rAFベースの高精度タイマー
  function startTimer(ms) {
    stopTimer();
    duration = ms;
    timerStart = performance.now();
    tick();
  }
  function tick(now) {
    if (!rafId && rafId !== 0) { /* timer not running */ }
    const t = now ?? performance.now();
    const elapsed = t - timerStart;
    const remaining = Math.max(0, duration - elapsed);
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      stopTimer();
      handleTimeOut();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }
  function stopTimer() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function updateTimerDisplay(remainingTimeMs) {
    timerDisplay.textContent = (remainingTimeMs / 1000).toFixed(1);
  }

  function handleBoardClick(event) {
    if (!gameActive) return;
    const clickedPanel = event.target.closest('.panel');
    if (clickedPanel) processPanelSelection(clickedPanel);
  }

  function handleBoardKeyDown(event) {
    if (!gameActive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      const focused = document.activeElement;
      if (focused && focused.classList.contains('panel')) {
        event.preventDefault(); processPanelSelection(focused);
      }
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const panels = Array.from(gameBoard.querySelectorAll('.panel'));
      const i = panels.findIndex(p => p === document.activeElement);
      let nx = -1, cols = GAME_SETTINGS.GRID_SIZE;
      if (i !== -1) {
        switch (event.key) {
          case 'ArrowUp': nx = i - cols; break;
          case 'ArrowDown': nx = i + cols; break;
          case 'ArrowLeft': nx = (i % cols === 0) ? -1 : i - 1; break;
          case 'ArrowRight': nx = (i % cols === cols - 1) ? -1 : i + 1; break;
        }
        if (nx >= 0 && nx < panels.length) panels[nx].focus();
      } else if (panels.length) { panels[0].focus(); }
    }
  }

  function processPanelSelection(panel) {
    if (!gameActive) return;
    stopTimer();
    disablePanelInteraction();
    const isTarget = panel.dataset.target === 'true';
    const isTestStage = currentQuestion <= colorBlindnessTestStages.length;

    if (isTarget) {
      score += GAME_SETTINGS.SCORE_PER_CORRECT; scoreDisplay.textContent = score;
      showResult('正解！', 'green');
      currentQuestion++;
      setTimeout(setupQuestion, GAME_SETTINGS.RESULT_DISPLAY_DELAY);
    } else {
      showResult('不正解…', 'red');
      if (isTestStage) colorBlindFlag = true;
      handleIncorrectChoice();
    }
  }

  function handleTimeOut() {
    showResult('時間切れ', 'orange');
    if (currentQuestion <= colorBlindnessTestStages.length) colorBlindFlag = true;
    handleIncorrectChoice();
  }

  function handleIncorrectChoice() {
    lives--; renderHearts();
    if (lives <= 0) setTimeout(gameOver, GAME_SETTINGS.RESULT_DISPLAY_DELAY);
    else setTimeout(setupQuestion, GAME_SETTINGS.RESULT_DISPLAY_DELAY * 0.8);
  }

  function gameClear() {
    gameEndTime = Date.now();
    showResult(`ゲームクリア！<br>スコア: ${score}<br>タイム: ${(gameEndTime - gameStartTime)/1000}秒`, 'purple');
    resultMessage.classList.add('cleared'); bodyElement.classList.add('game-cleared'); containerElement.classList.add('game-cleared');
    endGame(); showAdviceIfNeeded();
  }

  function gameOver() {
    gameEndTime = Date.now(); renderHearts();
    showResult(`ゲームオーバー… スコア: ${score}`, 'black');
    endGame(); showAdviceIfNeeded();
  }

  function endGame() {
    gameActive = false; stopTimer(); resetBtn.classList.remove('hidden'); startBtn.classList.add('hidden'); disablePanelInteraction();
  }
  function disablePanelInteraction() { gameBoard.style.pointerEvents = 'none'; gameBoard.querySelectorAll('.panel').forEach(p => p.removeAttribute('tabindex')); }
  function enablePanelInteraction() { gameBoard.style.pointerEvents = 'auto'; gameBoard.querySelectorAll('.panel').forEach(p => p.setAttribute('tabindex','0')); }
  function showResult(message, color) { resultMessage.innerHTML = message; resultMessage.style.color = color; resultMessage.classList.remove('hidden'); }
  function hideResult() { resultMessage.classList.add('hidden'); resultMessage.innerHTML = ''; resultMessage.classList.remove('cleared'); }

  // 色・変換系
  function generateRandomColor() {
    const r = Math.floor(Math.random() * 156) + 100;
    const g = Math.floor(Math.random() * 156) + 100;
    const b = Math.floor(Math.random() * 156) + 100;
    return `rgb(${r},${g},${b})`;
  }
  function generateSlightlyDifferentColor(rgbString, difference) {
    const [r, g, b] = cssToRgb(rgbString);
    let [nr, ng, nb] = [r, g, b];
    const idx = Math.floor(Math.random() * 3);
    const diff = Math.max(difference, 1) * (Math.random() < 0.5 ? 1 : -1);
    if (idx === 0) nr = clamp8(r + diff); else if (idx === 1) ng = clamp8(g + diff); else nb = clamp8(b + diff);
    return `rgb(${nr},${ng},${nb})`;
  }
  function clamp8(n) { return Math.max(0, Math.min(255, Math.round(n))); }
  function applyColorBlindness([r,g,b], type) {
    const m = colorBlindMatrices[type] || colorBlindMatrices.normal;
    const R = r*m[0][0] + g*m[0][1] + b*m[0][2];
    const G = r*m[1][0] + g*m[1][1] + b*m[1][2];
    const B = r*m[2][0] + g*m[2][1] + b*m[2][2];
    return [clamp8(R), clamp8(G), clamp8(B)];
  }
  function cssToRgb(css) {
    if (css.startsWith('#')) {
      let c = css.substring(1);
      if (c.length === 3) c = c.split('').map(x=>x+x).join('');
      const n = parseInt(c, 16); return [(n>>16)&255, (n>>8)&255, n&255];
    }
    if (css.startsWith('rgb')) return css.match(/\d+/g).map(Number);
    return [0,0,0];
  }
  function rgbToCss([r,g,b]) { return `rgb(${r},${g},${b})`; }

  function showAdviceIfNeeded() {
    if (colorBlindFlag) {
      adviceMessage.innerHTML = `
        難しかったと感じましたか？<br>
        色の見え方には個人差があります。<br>
        気になる場合は専門機関での相談も検討してください。<br>
        <b>まずは無理せず楽しく！</b>
        <br><a href="https://www.color-blindness.com/japanese/" target="_blank" rel="noopener" style="color:#1a73e8;text-decoration:underline">参考リンク</a>
      `;
      adviceMessage.classList.remove('hidden');
    }
  }
  function hideAdvice() { adviceMessage.innerHTML = ''; adviceMessage.classList.add('hidden'); }
});

