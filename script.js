/**
 * 色覚検定ゲーム v5.0
 * アーキテクチャ: オブジェクト指向 (Classベース)
 */

// ========================================================
// 1. 定数・設定データ
// ========================================================
const GAME_SETTINGS = {
    INITIAL_LIVES: 3,
    NUM_PANELS: 25,
    GRID_SIZE: 5,
    RESULT_DISPLAY_DELAY: 1000,
    SCORE_PER_CORRECT: 100,
    TIMER_DURATION_PER_QUESTION: 9000,
    MAX_QUESTIONS: 15
};

const cbTypeTips = {
    normal: `<b>通常（標準的な色覚）</b><br>色の感じ方は人それぞれで、多様性があります。<br>このゲームはどんな見え方でも楽しめるよう工夫しています。`,
    protanopia: `<b>プロタン（1型色覚／P型：赤に弱い）</b><br>赤色の区別が苦手な体質で、遺伝的に生じることが多いです。<br><span style="color:#ff5555;font-weight:bold;">※気になる場合は医療機関で相談を。</span>`,
    deuteranopia: `<b>デュータン（2型色覚／D型：緑に弱い）</b><br>緑色の区別がやや苦手な体質で、日本人男性に比較的多くみられます。<br><span style="color:#44aa44;font-weight:bold;">※気になる場合は医療機関で相談を。</span>`,
    tritanopia: `<b>トリタン（3型色覚／T型：青に弱い）</b><br>青や黄色の色の区別がしづらい、比較的まれなタイプです。<br><span style="color:#55aaff;font-weight:bold;">※気になる場合は医療機関で相談を。</span>`
};

const colorBlindMatrices = {
    normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    protanopia: [[0.56667, 0.43333, 0], [0.55833, 0.44167, 0], [0, 0.24167, 0.75833]],
    deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
    tritanopia: [[0.95, 0.05, 0], [0, 0.43333, 0.56667], [0, 0.475, 0.525]]
};

const colorBlindnessTestStages = [
    { base: [255, 68, 68], diff: [68, 255, 68] },   // Q1: 赤-緑 (プロタン向け)
    { base: [255, 255, 68], diff: [68, 255, 68] },  // Q2: 黄-緑 (デュータン向け)
    { base: [255, 153, 187], diff: [187, 187, 187] } // Q3: ピンク-灰 (トリタン向け)
];


// ========================================================
// 2. SoundManager (Web Audio API を用いた動的サウンド生成)
// ========================================================
class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.enabled = true;
    }

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled || !this.audioCtx) return;
        
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + duration);
    }

    playCorrect() {
        // ピン・ポン
        this.playTone(880, 'sine', 0.15, 0.1);
        setTimeout(() => this.playTone(1108.73, 'sine', 0.3, 0.1), 100);
    }

    playWrong() {
        // ブブッ
        this.playTone(150, 'sawtooth', 0.15, 0.1);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.2, 0.1), 150);
    }

    playTimeout() {
        // チーーーン
        this.playTone(400, 'square', 0.5, 0.05);
        setTimeout(() => this.playTone(350, 'square', 0.5, 0.05), 100);
    }

    playClear() {
        // ファンファーレ風
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.1), i * 150);
        });
        setTimeout(() => this.playTone(1046.50, 'sine', 0.6, 0.15), notes.length * 150 + 100);
    }
}


// ========================================================
// 3. UIManager (画面描画・DOMイベント管理)
// ========================================================
class UIManager {
    constructor(gameManager) {
        this.gm = gameManager;
        
        // DOM要素の取得
        this.dom = {
            container: document.getElementById('game-container'),
            board: document.getElementById('game-board'),
            startBtn: document.getElementById('start-btn'),
            resetBtn: document.getElementById('reset-btn'),
            resultMsg: document.getElementById('result-message'),
            qNum: document.getElementById('question-number'),
            score: document.getElementById('score'),
            hearts: document.getElementById('hearts'),
            timer: document.getElementById('timer'),
            advice: document.getElementById('advice-message'),
            cbButtons: document.querySelectorAll('#cb-mode-switcher button[data-type]'),
            cbTooltip: document.getElementById('cb-tooltip'),
            highlightBtn: document.getElementById('highlight-btn'),
            soundBtn: document.getElementById('sound-toggle-btn')
        };

        this.panelElements = [];
        this.initBoardDOM();
        this.bindEvents();
    }

    initBoardDOM() {
        this.dom.board.innerHTML = '';
        this.panelElements = [];
        for (let i = 0; i < GAME_SETTINGS.NUM_PANELS; i++) {
            const panel = document.createElement('div');
            panel.classList.add('panel');
            panel.setAttribute('role', 'button');
            panel.setAttribute('tabindex', '0');
            panel.dataset.index = i;
            this.dom.board.appendChild(panel);
            this.panelElements.push(panel);
        }
    }

    bindEvents() {
        this.dom.startBtn.addEventListener('click', () => this.gm.startGame());
        this.dom.resetBtn.addEventListener('click', () => this.gm.resetGame());
        
        // 色覚切替
        this.dom.cbButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.cbButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.gm.setCBType(btn.getAttribute('data-type'));
                this.updateTooltip(this.gm.currentCBType);
            });
            btn.addEventListener('mouseenter', () => this.updateTooltip(btn.getAttribute('data-type')));
            btn.addEventListener('mouseleave', () => this.updateTooltip(this.gm.currentCBType));
        });

        // 強調モード切替
        this.dom.highlightBtn.addEventListener('click', () => {
            const isActive = this.gm.toggleHighlightMode();
            this.dom.highlightBtn.textContent = isActive ? "ON" : "OFF";
            this.dom.highlightBtn.classList.toggle("active", isActive);
            this.dom.highlightBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        // サウンド切替
        this.dom.soundBtn.addEventListener('click', () => {
            this.gm.sound.init(); // ユーザー操作契機でAudioContextを有効化
            const isEnabled = this.gm.sound.toggle();
            this.dom.soundBtn.textContent = isEnabled ? "🔊" : "🔇";
            this.dom.soundBtn.classList.toggle('muted', !isEnabled);
        });

        // パネル操作
        this.dom.board.addEventListener('click', (e) => {
            const panel = e.target.closest('.panel');
            if (panel) this.gm.handlePanelSelect(parseInt(panel.dataset.index));
        });

        this.dom.board.addEventListener('keydown', (e) => {
            if (!this.gm.gameActive) return;
            if (e.key === 'Enter' || e.key === ' ') {
                const panel = document.activeElement;
                if (panel && panel.classList.contains('panel')) {
                    e.preventDefault();
                    this.gm.handlePanelSelect(parseInt(panel.dataset.index));
                }
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.handleArrowNavigation(e.key);
            }
        });
    }

    handleArrowNavigation(key) {
        const currentFocusIndex = this.panelElements.findIndex(p => p === document.activeElement);
        let nextFocusIndex = -1;
        const cols = GAME_SETTINGS.GRID_SIZE;
        
        if (currentFocusIndex !== -1) {
            switch (key) {
                case 'ArrowUp': nextFocusIndex = currentFocusIndex - cols; break;
                case 'ArrowDown': nextFocusIndex = currentFocusIndex + cols; break;
                case 'ArrowLeft': nextFocusIndex = currentFocusIndex - 1; if (currentFocusIndex % cols === 0) nextFocusIndex = -1; break;
                case 'ArrowRight': nextFocusIndex = currentFocusIndex + 1; if (currentFocusIndex % cols === cols - 1) nextFocusIndex = -1; break;
            }
            if (nextFocusIndex >= 0 && nextFocusIndex < this.panelElements.length) {
                this.panelElements[nextFocusIndex].focus();
            }
        } else if (this.panelElements.length > 0) {
            this.panelElements[0].focus();
        }
    }

    updateTooltip(type) {
        this.dom.cbTooltip.innerHTML = cbTypeTips[type] || "";
    }

    updateScore(score) { this.dom.score.textContent = score; }
    updateQuestion(q, max) { this.dom.qNum.textContent = `${q}/${max}`; }
    updateTimer(ms) { this.dom.timer.textContent = (ms / 1000).toFixed(1); }

    renderHearts(lives) {
        this.dom.hearts.innerHTML = '';
        const heartSVG = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        const brokenHeartSVG = `<svg class="broken" viewBox="0 0 24 24"><path d="M13.45 3.13l-.2.23-.2-.23C12.46 2.52 11.76 2 11 2c-1.74 0-3.41.81-4.5 2.09C5.41 5.19 5 6.3 5 7.5c0 2.12 1.64 4.15 4.18 6.51l.47.43-.65.65-3.05-2.73c-1.04-.94-2.08-2-2.08-3.36 0-1.54 1.13-2.84 2.62-3.16.8-.18 1.63-.01 2.38.51L9.5 5.5l1.5-1.5-1.1-1.1c.6-.5 1.3-.7 2.1-.7.76 0 1.46.29 2.05.88l.2.23zM19.5 3c-1.74 0-3.41.81-4.5 2.09l-1.1 1.1 1.5 1.5L16 6.5l.38-.38c.75-.52 1.58-.69 2.38-.51 1.49.32 2.62 1.62 2.62 3.16 0 1.36-1.04 2.42-2.08 3.36l-3.05 2.73.65.65.47-.43C17.36 11.65 19 9.62 19 7.5c0-1.2-.41-2.31-1.5-3.41z"/></svg>`;
        for (let i = 0; i < lives; i++) {
            this.dom.hearts.insertAdjacentHTML('beforeend', `<span>${heartSVG}</span>`);
        }
        if (lives === 0) {
            this.dom.hearts.insertAdjacentHTML('beforeend', `<span>${brokenHeartSVG}</span>`);
        }
    }

    drawBoard(panelsData) {
        panelsData.forEach((p, idx) => {
            const el = this.panelElements[idx];
            el.style.backgroundColor = p.displayColor;
            el.classList.remove('wrong');
        });
    }

    shakeBoard() {
        this.dom.container.classList.add('shake');
        setTimeout(() => this.dom.container.classList.remove('shake'), 400);
    }

    shakePanel(index) {
        this.panelElements[index].classList.add('wrong');
    }

    setInteractions(enabled) {
        this.dom.board.style.pointerEvents = enabled ? 'auto' : 'none';
        this.panelElements.forEach(p => {
            if (enabled) p.setAttribute('tabindex', '0');
            else p.removeAttribute('tabindex');
        });
    }

    showResult(msg, color) {
        this.dom.resultMsg.innerHTML = msg;
        this.dom.resultMsg.style.color = color;
        this.dom.resultMsg.classList.remove('hidden', 'cleared');
    }

    hideResult() {
        this.dom.resultMsg.innerHTML = '';
        this.dom.resultMsg.classList.add('hidden');
    }

    toggleGameButtons(isPlaying) {
        if (isPlaying) {
            this.dom.startBtn.classList.add('hidden');
            this.dom.resetBtn.classList.remove('hidden');
        } else {
            this.dom.startBtn.classList.remove('hidden');
            this.dom.resetBtn.classList.add('hidden');
        }
    }

    triggerClearAnimation() {
        this.dom.resultMsg.classList.add('cleared');
        document.body.classList.add('game-cleared');
        this.dom.container.classList.add('game-cleared');
    }

    resetClearAnimation() {
        document.body.classList.remove('game-cleared');
        this.dom.container.classList.remove('game-cleared');
        this.dom.resultMsg.classList.remove('cleared');
    }

    showAdvice() {
        this.dom.advice.innerHTML = `
            最近目を酷使しすぎていませんか？<br>
            色の見え方は体調や疲労でも変わることがあります。<br>
            気になるようなら、一度病院で相談してみるのも選択肢です。<br>
            <b>目は大切に！</b>👀✨
            <br><a href="https://www.gankaikai.or.jp/health/50/" target="_blank" rel="noopener" style="color:#1a73e8;text-decoration:underline">色覚異常について詳しく(日本眼科医会)</a>
        `;
        this.dom.advice.classList.remove('hidden');
    }

    hideAdvice() {
        this.dom.advice.innerHTML = '';
        this.dom.advice.classList.add('hidden');
    }
}


// ========================================================
// 4. GameManager (ゲームのコアロジック)
// ========================================================
class GameManager {
    constructor() {
        this.sound = new SoundManager();
        this.ui = new UIManager(this);
        
        // 状態
        this.currentCBType = "normal";
        this.highlightExperienceMode = false;
        
        this.gameActive = false;
        this.currentQuestion = 1;
        this.score = 0;
        this.lives = GAME_SETTINGS.INITIAL_LIVES;
        this.targetIndex = -1;
        
        this.timerInterval = null;
        this.timeLeft = 0;
        this.gameStartTime = 0;
        
        // 早期発見フラグ（1~3問目でミスがあったか）
        this.colorBlindFlag = false;
        
        this.panelsData = [];

        this.ui.updateTooltip(this.currentCBType);
        this.resetGame();
    }

    setCBType(type) {
        this.currentCBType = type;
        if (this.gameActive) this.updateBoardColors();
        else this.resetGame(); // 非アクティブ時は色リセット
    }

    toggleHighlightMode() {
        this.highlightExperienceMode = !this.highlightExperienceMode;
        if (this.gameActive) this.updateBoardColors();
        return this.highlightExperienceMode;
    }

    startGame() {
        if (this.gameActive) return;
        this.sound.init(); // ユーザーインタラクション時にAudioContextを初期化
        this.gameActive = true;
        this.score = 0;
        this.lives = GAME_SETTINGS.INITIAL_LIVES;
        this.currentQuestion = 1;
        this.colorBlindFlag = false;
        this.gameStartTime = Date.now();
        
        this.ui.updateScore(this.score);
        this.ui.renderHearts(this.lives);
        this.ui.hideResult();
        this.ui.hideAdvice();
        this.ui.resetClearAnimation();
        this.ui.toggleGameButtons(true);
        
        this.setupQuestion();
    }

    resetGame() {
        this.stopTimer();
        this.gameActive = false;
        this.currentQuestion = 1;
        this.score = 0;
        this.lives = GAME_SETTINGS.INITIAL_LIVES;
        this.colorBlindFlag = false;
        
        this.ui.updateQuestion(this.currentQuestion, GAME_SETTINGS.MAX_QUESTIONS);
        this.ui.updateScore(this.score);
        this.ui.renderHearts(this.lives);
        this.ui.updateTimer(GAME_SETTINGS.TIMER_DURATION_PER_QUESTION);
        
        this.ui.hideResult();
        this.ui.hideAdvice();
        this.ui.resetClearAnimation();
        this.ui.toggleGameButtons(false);
        this.ui.setInteractions(false);

        // リセット時は全パネルグレー
        this.panelsData = Array(GAME_SETTINGS.NUM_PANELS).fill({ displayColor: '#ccc' });
        this.ui.drawBoard(this.panelsData);
    }

    setupQuestion() {
        if (this.lives <= 0) { this.endGame('over'); return; }
        if (this.currentQuestion > GAME_SETTINGS.MAX_QUESTIONS) { this.endGame('clear'); return; }

        this.ui.updateQuestion(this.currentQuestion, GAME_SETTINGS.MAX_QUESTIONS);
        this.ui.hideResult();

        let baseRGB, diffRGB;

        if (this.currentQuestion <= colorBlindnessTestStages.length) {
            // ステージ1~3: 意図的な色覚混同色テスト
            baseRGB = colorBlindnessTestStages[this.currentQuestion - 1].base;
            diffRGB = colorBlindnessTestStages[this.currentQuestion - 1].diff;
        } else {
            // ステージ4以降: HSLベースの動的難易度テスト
            let difficultyValue;
            if (this.currentQuestion <= 10) difficultyValue = 60 - (this.currentQuestion - 4) * 5;
            else difficultyValue = [14, 12, 10, 8, 6][this.currentQuestion - 11];
            
            const h = Math.floor(Math.random() * 360);
            const s = Math.floor(Math.random() * 40) + 60; 
            const l = Math.floor(Math.random() * 40) + 40; 
            
            baseRGB = this.hslToRgb(h, s, l);
            
            const changeAmount = Math.max(difficultyValue / 2.5, 2); 
            let newL = l + (Math.random() < 0.5 ? changeAmount : -changeAmount);
            if (newL > 95) newL = l - changeAmount;
            if (newL < 5) newL = l + changeAmount;
            
            diffRGB = this.hslToRgb(h, s, newL);
        }

        this.targetIndex = Math.floor(Math.random() * GAME_SETTINGS.NUM_PANELS);
        
        // パネルデータを生成
        this.panelsData = [];
        for (let i = 0; i < GAME_SETTINGS.NUM_PANELS; i++) {
            this.panelsData.push({
                index: i,
                rawRGB: (i === this.targetIndex) ? diffRGB : baseRGB,
                isTarget: (i === this.targetIndex)
            });
        }
        
        this.updateBoardColors();
        this.ui.setInteractions(true);
        this.startTimer();
    }

    updateBoardColors() {
        const isEarlyStage = this.currentQuestion <= 3;
        this.panelsData.forEach(p => {
            // 強調モード処理（1～3問目のみ）
            if (this.highlightExperienceMode && isEarlyStage) {
                if (this.currentCBType === "protanopia" && this.currentQuestion === 1) p.displayColor = "#828d82";
                else if (this.currentCBType === "deuteranopia" && this.currentQuestion === 2) p.displayColor = "#7d907d";
                else if (this.currentCBType === "tritanopia" && this.currentQuestion === 3) p.displayColor = "#bdbdbd";
                else p.displayColor = this.rgbToCss(this.applyColorBlindness(p.rawRGB, this.currentCBType));
            } else {
                p.displayColor = this.rgbToCss(this.applyColorBlindness(p.rawRGB, this.currentCBType));
            }
        });
        this.ui.drawBoard(this.panelsData);
    }

    handlePanelSelect(index) {
        if (!this.gameActive) return;
        
        this.stopTimer();
        this.ui.setInteractions(false);
        
        const isTarget = (index === this.targetIndex);
        const isColorBlindTestStage = this.currentQuestion <= colorBlindnessTestStages.length;

        if (isTarget) {
            this.sound.playCorrect();
            this.score += GAME_SETTINGS.SCORE_PER_CORRECT;
            this.ui.updateScore(this.score);
            this.ui.showResult('正解！✨', '#4CAF50');
            this.currentQuestion++;
            setTimeout(() => this.setupQuestion(), GAME_SETTINGS.RESULT_DISPLAY_DELAY);
        } else {
            this.sound.playWrong();
            this.ui.shakePanel(index);
            this.ui.shakeBoard();
            this.ui.showResult('不正解... 💧', '#f44336');
            
            if (isColorBlindTestStage) this.colorBlindFlag = true;
            this.processMistake();
        }
    }

    processMistake() {
        this.lives--;
        this.ui.renderHearts(this.lives);
        if (this.lives <= 0) {
            setTimeout(() => this.endGame('over'), GAME_SETTINGS.RESULT_DISPLAY_DELAY);
        } else {
            // ミス時は少し早めに次へ
            setTimeout(() => this.setupQuestion(), GAME_SETTINGS.RESULT_DISPLAY_DELAY * 0.8);
        }
    }

    startTimer() {
        this.stopTimer();
        this.timeLeft = GAME_SETTINGS.TIMER_DURATION_PER_QUESTION;
        this.ui.updateTimer(this.timeLeft);
        
        const startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const remaining = this.timeLeft - (Date.now() - startTime);
            if (remaining <= 0) {
                this.stopTimer();
                this.ui.updateTimer(0);
                this.handleTimeOut();
            } else {
                this.ui.updateTimer(remaining);
            }
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleTimeOut() {
        this.sound.playTimeout();
        this.ui.setInteractions(false);
        this.ui.showResult('時間切れ！ ⏳', '#ff9800');
        if (this.currentQuestion <= colorBlindnessTestStages.length) this.colorBlindFlag = true;
        this.processMistake();
    }

    endGame(type) {
        this.gameActive = false;
        this.stopTimer();
        this.ui.setInteractions(false);
        this.ui.toggleGameButtons(false);

        if (type === 'clear') {
            this.sound.playClear();
            const timeStr = ((Date.now() - this.gameStartTime) / 1000).toFixed(1);
            this.ui.showResult(`🏆 全問正解！おめでとう！ 🏆<br>スコア: ${this.score}<br>タイム: ${timeStr}秒`, '#9c27b0');
            this.ui.triggerClearAnimation();
        } else {
            this.ui.showResult(`ゲームオーバー... スコア: ${this.score}`, '#333');
        }

        if (this.colorBlindFlag) {
            this.ui.showAdvice();
        }
    }

    // --- Color Math Helpers ---
    hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
    }

    applyColorBlindness(rgbArr, type) {
        const m = colorBlindMatrices[type] || colorBlindMatrices.normal;
        const r = rgbArr[0] * m[0][0] + rgbArr[1] * m[0][1] + rgbArr[2] * m[0][2];
        const g = rgbArr[0] * m[1][0] + rgbArr[1] * m[1][1] + rgbArr[2] * m[1][2];
        const b = rgbArr[0] * m[2][0] + rgbArr[1] * m[2][1] + rgbArr[2] * m[2][2];
        return [Math.round(r), Math.round(g), Math.round(b)];
    }

    rgbToCss(arr) {
        return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
    }
}

// 起動
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GameManager();
});
