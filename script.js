/* ▼ グローバルエラーハンドラ */
window.onerror = function(message, source, lineno, colno, error) {
  console.error("キャッチされなかったエラー:", message, source, lineno, colno, error);
  const body = document.body;
  if (body) {
    body.innerHTML = '<div style="text-align: center; padding: 2em;"><h1>予期せぬエラーが発生しました</h1><p>ご迷惑をおかけします。ページを再読み込みするか、開発者にご連絡ください。</p></div>';
  }
  return true; // デフォルトのエラー処理を抑制
};

/* ▼ 色覚タイプ説明・変換マトリックス */
const cbTypeTips = {
  normal: `<b>通常（標準的な色覚）</b><br>
  色の感じ方は人それぞれで、多様性があります。<br>
  このゲームはどんな見え方でも楽しめるよう工夫しています。`,

  protanopia: `<b>プロタン（1型色覚／P型：赤に弱い）</b><br>
  ※日本の医療現場では「1型色覚」や「P型」と呼ばれることが一般的です。<br>
  赤色の区別が苦手な体質で、遺伝的に生じることが多いです。。<br>
  <span style="color:#ff5555;font-weight:bold;">※気になる場合は医療機関で相談を。</span><br>
  <a href="https://www.gankaikai.or.jp/health/50/" target="_blank" rel="noopener">日本眼科医会：色覚異常といわれたら</a>`,

  deuteranopia: `<b>デュータン（2型色覚／D型：緑に弱い）</b><br>
  ※日本では「2型色覚」や「D型」という呼び方が一般的です。<br>
  緑色の区別がやや苦手な体質で、日本人男性に比較的多くみられます。<br>
  <span style="color:#44aa44;font-weight:bold;">※気になる場合は医療機関で相談を。</span><br>
  <a href="https://www.gankaikai.or.jp/health/50/" target="_blank" rel="noopener">日本眼科医会：色覚異常といわれたら</a>`,

  tritanopia: `<b>トリタン（3型色覚／T型：青に弱い）</b><br>
  ※「3型色覚」「T型」とも呼ばれます（日本眼科学会）。<br>
  青や黄色の色の区別がしづらい、比較的まれなタイプです。
  <span style="color:#55aaff;font-weight:bold;">※気になる場合は医療機関で相談を。</span><br>
  <a href="https://www.gankaikai.or.jp/health/50/" target="_blank" rel="noopener">日本眼科医会：色覚異常といわれたら</a>`
};
const colorBlindMatrices = {
    normal: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ],
    protanopia: [
        [0.56667, 0.43333, 0],
        [0.55833, 0.44167, 0],
        [0, 0.24167, 0.75833]
    ],
    deuteranopia: [
        [0.625, 0.375, 0],
        [0.7, 0.3, 0],
        [0, 0.3, 0.7]
    ],
    tritanopia: [
        [0.95, 0.05, 0],
        [0, 0.43333, 0.56667],
        [0, 0.475, 0.525]
    ]
};

let currentCBType = "normal";
let highlightExperienceMode = false; // 強調モード初期OFF

document.addEventListener('DOMContentLoaded', () => {
  try {
    // --- DOM要素の取得 ---
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const body = document.body;
    const gameBoard = document.getElementById('game-board');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultMessage = document.getElementById('result-message');
    const questionNumberDisplay = document.getElementById('question-number');
    const scoreDisplay = document.getElementById('score');
    const heartsContainer = document.getElementById('hearts');
    const timerDisplay = document.getElementById('timer');
    const adviceMessage = document.getElementById('advice-message');
    const containerElement = document.querySelector('.container');
    const cbModeSwitcher = document.getElementById('cb-mode-switcher');
    const cbTooltip = document.getElementById('cb-tooltip');
    const highlightBtn = document.getElementById('highlight-btn');

    // --- DOM要素の存在チェック ---
    const requiredElements = {
        themeToggleBtn, body, gameBoard, startBtn, resetBtn, resultMessage,
        questionNumberDisplay, scoreDisplay, heartsContainer, timerDisplay,
        adviceMessage, containerElement, cbModeSwitcher, cbTooltip, highlightBtn
    };
    for (const [name, el] of Object.entries(requiredElements)) {
        if (!el) throw new Error(`必須DOM要素が見つかりません: ${name}`);
    }
    const cbButtons = cbModeSwitcher.querySelectorAll('button[data-type]');
    if (cbButtons.length === 0) throw new Error('色覚タイプ切替ボタンが見つかりません。');

    // --- テーマ切替処理 ---
    const applyTheme = (theme) => {
        if (theme === "dark") {
            body.classList.add("dark-mode");
            body.classList.remove("light-mode");
        } else {
            body.classList.add("light-mode");
            body.classList.remove("dark-mode");
        }
    };

    themeToggleBtn.addEventListener("click", () => {
        if (body.classList.contains("dark-mode")) {
            localStorage.setItem("theme", "light");
            applyTheme("light");
        } else {
            localStorage.setItem("theme", "dark");
            applyTheme("dark");
        }
    });

    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        applyTheme("dark");
    } else {
        applyTheme("light");
    }

    // --- ゲームロジック ---
    const GAME_SETTINGS = {
        INITIAL_LIVES: 3,
        NUM_PANELS: 25,
        GRID_SIZE: 5,
        RESULT_DISPLAY_DELAY: 1000,
        SCORE_PER_CORRECT: 100,
        TIMER_DURATION_PER_QUESTION: 9000,
        MAX_QUESTIONS: 15
    };
    const colorBlindnessTestStages = [
        { base: '#FF4444', diff: '#44FF44' }, // 赤-緑
        { base: '#FFFF44', diff: '#44FF44' }, // 黄-緑
        { base: '#FF99BB', diff: '#BBBBBB' }  // ピンク-灰
    ];

    let gameActive = false;
    let currentQuestion = 1;
    let score = 0;
    let lives = GAME_SETTINGS.INITIAL_LIVES;
    let targetIndex = -1;
    let timerInterval = null;
    let timeLeft = 0;
    let colorBlindFlag = false;
    let gameStartTime = 0;
    let gameEndTime = 0;
    let currentPanels = [];

    // --- 色覚切替イベント ---
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
        cbTooltip.innerHTML = cbTypeTips[type] || "";
    }

    // --- 強調モードON/OFF ---
    highlightBtn.addEventListener('click', () => {
        highlightExperienceMode = !highlightExperienceMode;
        highlightBtn.textContent = highlightExperienceMode ? "ON" : "OFF";
        highlightBtn.classList.toggle("active", highlightExperienceMode);
        highlightBtn.setAttribute("aria-pressed", highlightExperienceMode ? "true" : "false");
        redrawPanels();
    });

    // --- ゲームコア処理 ---
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', resetGame);
    gameBoard.addEventListener('click', handleBoardClick);
    gameBoard.addEventListener('keydown', handleBoardKeyDown);

    initializeGameUI();

    function initializeGameUI() {
        currentQuestion = 1;
        score = 0;
        lives = GAME_SETTINGS.INITIAL_LIVES;
        colorBlindFlag = false;
        gameActive = false;
        renderHearts();
        updateQuestionDisplay();
        scoreDisplay.textContent = score;
        timerDisplay.textContent = (GAME_SETTINGS.TIMER_DURATION_PER_QUESTION/1000).toFixed(1);
        startBtn.classList.remove('hidden');
        resetBtn.classList.add('hidden');
        hideResult();
        hideAdvice();
        gameBoard.innerHTML = '';
        body.classList.remove('game-cleared');
        containerElement.classList.remove('game-cleared');
        resultMessage.classList.remove('cleared');
        disablePanelInteraction();
        currentPanels = [];
        redrawPanels();
    }

    function startGame() {
        if (gameActive) return;
        gameActive = true;
        score = 0;
        lives = GAME_SETTINGS.INITIAL_LIVES;
        currentQuestion = 1;
        colorBlindFlag = false;
        gameStartTime = Date.now();
        updateQuestionDisplay();
        scoreDisplay.textContent = score;
        renderHearts();
        hideResult();
        hideAdvice();
        startBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
        setupQuestion();
    }

    function resetGame() {
        stopTimer();
        initializeGameUI();
    }
    function renderHearts() {
        heartsContainer.innerHTML = '';
        const heartSVG = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        const brokenHeartSVG = `<svg class="broken" viewBox="0 0 24 24"><path d="M13.45 3.13l-.2.23-.2-.23C12.46 2.52 11.76 2 11 2c-1.74 0-3.41.81-4.5 2.09C5.41 5.19 5 6.3 5 7.5c0 2.12 1.64 4.15 4.18 6.51l.47.43-.65.65-3.05-2.73c-1.04-.94-2.08-2-2.08-3.36 0-1.54 1.13-2.84 2.62-3.16.8-.18 1.63-.01 2.38.51L9.5 5.5l1.5-1.5-1.1-1.1c.6-.5 1.3-.7 2.1-.7.76 0 1.46.29 2.05.88l.2.23zM19.5 3c-1.74 0-3.41.81-4.5 2.09l-1.1 1.1 1.5 1.5L16 6.5l.38-.38c.75-.52 1.58-.69 2.38-.51 1.49.32 2.62 1.62 2.62 3.16 0 1.36-1.04 2.42-2.08 3.36l-3.05 2.73.65.65.47-.43C17.36 11.65 19 9.62 19 7.5c0-1.2-.41-2.31-1.5-3.41z"/></svg>`;
        for (let i = 0; i < lives; i++) {
            const heartElement = document.createElement('span');
            heartElement.innerHTML = heartSVG;
            heartsContainer.appendChild(heartElement);
        }
        if (lives === 0) {
            const heartElement = document.createElement('span');
            heartElement.innerHTML = brokenHeartSVG;
            heartsContainer.appendChild(heartElement);
        }
    }

    function updateQuestionDisplay() {
        questionNumberDisplay.textContent = `${currentQuestion}/${GAME_SETTINGS.MAX_QUESTIONS}`;
    }

    function setupQuestion() {
        if (lives <= 0) { gameOver(); return; }
        if (currentQuestion > GAME_SETTINGS.MAX_QUESTIONS) { gameClear(); return; }

        updateQuestionDisplay();
        gameBoard.innerHTML = '';
        hideResult();
        hideAdvice();

        let baseColor, diffColor, difficulty;
        if (currentQuestion <= colorBlindnessTestStages.length) {
            baseColor = colorBlindnessTestStages[currentQuestion - 1].base;
            diffColor = colorBlindnessTestStages[currentQuestion - 1].diff;
        } else if (currentQuestion <= 10) {
            difficulty = 60 - (currentQuestion - 4) * 5;
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
            currentPanels.push({
                index: i,
                rawColor: rawColor,
                isTarget: i === targetIndex
            });
            const displayColor = getPanelDisplayColor(rawColor, i, currentQuestion <= 3);
            const panel = document.createElement('div');
            panel.classList.add('panel');
            panel.style.backgroundColor = displayColor;
            panel.dataset.target = (i === targetIndex) ? 'true' : 'false';
            panel.setAttribute('role', 'button');
            panel.setAttribute('tabindex', '0');
            fragment.appendChild(panel);
        }
        gameBoard.appendChild(fragment);
        enablePanelInteraction();
        startTimer();
    }

    // --- 強調モード時の色設定（1～3問だけ） ---
    function getPanelDisplayColor(rawColor, index, isColorBlindTestStage) {
        if (highlightExperienceMode && isColorBlindTestStage) {
            if (currentCBType === "protanopia" && currentQuestion === 1) {
                return "#828d82"; // 灰色＋深緑っぽい色
            }
            if (currentCBType === "deuteranopia" && currentQuestion === 2) {
                return "#7d907d"; // 暗めグリーングレー
            }
            if (currentCBType === "tritanopia" && currentQuestion === 3) {
                return "#bdbdbd"; // 明るい灰色
            }
        }
        // 通常の色覚変換
        const rgb = cssToRgb(rawColor);
        return rgbToCss(applyColorBlindness(rgb, currentCBType));
    }

    function redrawPanels() {
        if (!currentPanels || currentPanels.length !== GAME_SETTINGS.NUM_PANELS) return;
        const panelEls = Array.from(gameBoard.querySelectorAll('.panel'));
        currentPanels.forEach((panelInfo, idx) => {
            if (panelEls[idx]) {
                const displayColor = getPanelDisplayColor(panelInfo.rawColor, idx, currentQuestion <= 3);
                panelEls[idx].style.backgroundColor = displayColor;
            }
        });
    }

    function startTimer() {
        stopTimer();
        timeLeft = GAME_SETTINGS.TIMER_DURATION_PER_QUESTION;
        updateTimerDisplay(timeLeft);
        const startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const remaining = timeLeft - elapsedTime;
            if (remaining <= 0) {
                stopTimer();
                updateTimerDisplay(0);
                handleTimeOut();
            } else {
                updateTimerDisplay(remaining);
            }
        }, 100);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function updateTimerDisplay(remainingTimeMs) {
        timerDisplay.textContent = (remainingTimeMs / 1000).toFixed(1);
    }

    function handleBoardClick(event) {
        if (!gameActive) return;
        const clickedPanel = event.target.closest('.panel');
        if (clickedPanel) {
            processPanelSelection(clickedPanel);
        }
    }

    function handleBoardKeyDown(event) {
        if (!gameActive) return;
        if (event.key === 'Enter' || event.key === ' ') {
            const focusedPanel = document.activeElement;
            if (focusedPanel && focusedPanel.classList.contains('panel')) {
                event.preventDefault();
                processPanelSelection(focusedPanel);
            }
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            const panels = Array.from(gameBoard.querySelectorAll('.panel'));
            const currentFocusIndex = panels.findIndex(p => p === document.activeElement);
            let nextFocusIndex = -1;
            const cols = GAME_SETTINGS.GRID_SIZE;
            if (currentFocusIndex !== -1) {
                switch (event.key) {
                    case 'ArrowUp': nextFocusIndex = currentFocusIndex - cols; break;
                    case 'ArrowDown': nextFocusIndex = currentFocusIndex + cols; break;
                    case 'ArrowLeft': nextFocusIndex = currentFocusIndex - 1; if (currentFocusIndex % cols === 0) nextFocusIndex = -1; break;
                    case 'ArrowRight': nextFocusIndex = currentFocusIndex + 1; if (currentFocusIndex % cols === cols - 1) nextFocusIndex = -1; break;
                }
                if (nextFocusIndex >= 0 && nextFocusIndex < panels.length) {
                    panels[nextFocusIndex].focus();
                }
            } else if (panels.length > 0) {
                panels[0].focus();
            }
        }
    }

    function processPanelSelection(panel) {
        if (!gameActive) return;
        stopTimer();
        disablePanelInteraction();
        const isTarget = panel.dataset.target === 'true';
        const isColorBlindTestStage = currentQuestion <= colorBlindnessTestStages.length;

        if (isTarget) {
            score += GAME_SETTINGS.SCORE_PER_CORRECT;
            scoreDisplay.textContent = score;
            showResult('正解！✨', 'green');
            currentQuestion++;
            setTimeout(setupQuestion, GAME_SETTINGS.RESULT_DISPLAY_DELAY);
        } else {
            showResult('不正解... 💧', 'red');
            if (isColorBlindTestStage) colorBlindFlag = true;
            handleIncorrectChoice();
        }
    }

    function handleTimeOut() {
        showResult('時間切れ！ ⏳', 'orange');
        if (currentQuestion <= colorBlindnessTestStages.length) colorBlindFlag = true;
        handleIncorrectChoice();
    }

    function handleIncorrectChoice() {
        lives--;
        renderHearts();
        if (lives <= 0) {
            setTimeout(gameOver, GAME_SETTINGS.RESULT_DISPLAY_DELAY);
        } else {
            setTimeout(setupQuestion, GAME_SETTINGS.RESULT_DISPLAY_DELAY * 0.8);
        }
    }

    function gameClear() {
        gameEndTime = Date.now();
        showResult(`🏆 全問正解！おめでとう！ 🏆<br>スコア: ${score}<br>タイム: ${(gameEndTime - gameStartTime)/1000}秒`, 'purple');
        resultMessage.classList.add('cleared');
        body.classList.add('game-cleared');
        containerElement.classList.add('game-cleared');
        endGame();
        showAdviceIfNeeded();
    }

    function gameOver() {
        gameEndTime = Date.now();
        renderHearts();
        showResult(`ゲームオーバー... スコア: ${score}`, 'black');
        endGame();
        showAdviceIfNeeded();
    }

    function endGame() {
        gameActive = false;
        stopTimer();
        resetBtn.classList.remove('hidden');
        startBtn.classList.add('hidden');
        disablePanelInteraction();
    }

    function disablePanelInteraction() {
        gameBoard.style.pointerEvents = 'none';
        gameBoard.querySelectorAll('.panel').forEach(p => { p.removeAttribute('tabindex'); });
    }

    function enablePanelInteraction() {
        gameBoard.style.pointerEvents = 'auto';
        gameBoard.querySelectorAll('.panel').forEach(p => { p.setAttribute('tabindex', '0'); });
    }

    function showResult(message, color) {
        resultMessage.innerHTML = message;
        resultMessage.style.color = color;
        resultMessage.classList.remove('hidden');
    }

    function hideResult() {
        resultMessage.classList.add('hidden');
        resultMessage.innerHTML = '';
        resultMessage.classList.remove('cleared');
    }

    // --- 色変換関連 ---
    function generateRandomColor() {
        const r = Math.floor(Math.random() * 156) + 100;
        const g = Math.floor(Math.random() * 156) + 100;
        const b = Math.floor(Math.random() * 156) + 100;
        return `rgb(${r},${g},${b})`;
    }
    function generateSlightlyDifferentColor(rgbString, difference) {
        const [r, g, b] = cssToRgb(rgbString);
        let newR = r, newG = g, newB = b;
        const changeIndex = Math.floor(Math.random() * 3);
        const effectiveDifference = Math.max(difference, 1);
        const changeAmount = Math.random() < 0.5 ? effectiveDifference : -effectiveDifference;
        if (changeIndex === 0) newR = Math.max(0, Math.min(255, r + changeAmount));
        else if (changeIndex === 1) newG = Math.max(0, Math.min(255, g + changeAmount));
        else newB = Math.max(0, Math.min(255, b + changeAmount));
        return `rgb(${newR},${newG},${newB})`;
    }
    function applyColorBlindness(rgbArr, type) {
        const m = colorBlindMatrices[type] || colorBlindMatrices.normal;
        const r = rgbArr[0] * m[0][0] + rgbArr[1] * m[0][1] + rgbArr[2] * m[0][2];
        const g = rgbArr[0] * m[1][0] + rgbArr[1] * m[1][1] + rgbArr[2] * m[1][2];
        const b = rgbArr[0] * m[2][0] + rgbArr[1] * m[2][1] + rgbArr[2] * m[2][2];
        return [Math.round(r), Math.round(g), Math.round(b)];
    }
    function cssToRgb(css) {
        if (css.startsWith("#")) {
            let c = css.substring(1);
            if (c.length === 3) c = c.split("").map(x=>x+x).join("");
            const n = parseInt(c, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        if (css.startsWith("rgb")) {
            return css.match(/\d+/g).map(Number);
        }
        return [0,0,0];
    }
    function rgbToCss(arr) {
        return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
    }

    function showAdviceIfNeeded() {
        if (colorBlindFlag) {
            adviceMessage.innerHTML = `
                最近目を酷使しすぎていませんか？<br>
                色の見え方は体調や疲労でも変わることがあります。<br>
                気になるようなら、一度病院で相談してみるのも選択肢です。<br>
                <b>目は大切に！</b>👀✨
                <br><a href="https://www.color-blindness.com/japanese/" target="_blank" style="color:#1a73e8;text-decoration:underline">色覚多様性について詳しく</a>
                <div style="margin-top:0.7em; font-size:0.98em; color:#446;">
                    例: 焼肉屋で肉の焼け具合が分かりづらいなど、日常生活でも困ることがあるんだ！
                </div>
            `;
            adviceMessage.classList.remove('hidden');
        }
    }
    function hideAdvice() {
        adviceMessage.innerHTML = '';
        adviceMessage.classList.add('hidden');
    }
  } catch (error) {
    console.error("ゲームの初期化または実行中にエラーが発生しました:", error);
    const resultEl = document.getElementById('result-message') || document.body;
    resultEl.innerHTML = `<div style="text-align: center; padding: 1em; color: red;">
                          <strong>エラーが発生しました</strong><br>${error.message}<br>ページを更新してください。
                          </div>`;
    if (resultEl.classList) resultEl.classList.remove('hidden');
  }
});
