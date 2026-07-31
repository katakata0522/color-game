/**
 * 色の見え方体験ゲーム v5.2
 * ハイブリッド：楽しいゲーム + 安全な啓発（診断なし）
 * リファクタリング済み：ColorUtils分離 / 状態管理整理 / UX滑らか化
 */

// ========================================================
// 1. 定数
// ========================================================
const GAME_SETTINGS = {
  INITIAL_LIVES: 3,
  NUM_PANELS: 25,
  GRID_SIZE: 5,
  RESULT_DISPLAY_DELAY: 900,
  SCORE_PER_CORRECT: 100,
  COMBO_BONUS: 30,
  TIMER_DURATION_MS: 9000,
  MAX_QUESTIONS: 15,
  MIN_COLOR_DISTANCE: 32,          // シミュレーション後の最低距離
  FAMILY_QUESTION_DELAY: 700       // 結果表示後に家族質問を出すまでの遅延
};

const CB_TIPS = {
  normal: `<b>通常（標準的な色覚）</b><br>色の感じ方は人それぞれで、多様性があります。<br>このゲームはどんな見え方でも楽しめるよう工夫しています。`,
  protanopia: `<b>プロタン（1型色覚／P型：赤に弱い）</b><br>赤色の区別が苦手な体質で、遺伝的に生じることが多いです。<br><span style="color:#ff5555;font-weight:bold;">※気になる場合は医療機関で相談を。</span>`,
  deuteranopia: `<b>デュータン（2型色覚／D型：緑に弱い）</b><br>緑色の区別がやや苦手な体質で、日本人男性に比較的多くみられます。<br><span style="color:#44aa44;font-weight:bold;">※気になる場合は医療機関で相談を。</span>`,
  tritanopia: `<b>トリタン（3型色覚／T型：青に弱い）</b><br>青や黄色の色の区別がしづらい、比較的まれなタイプです。<br><span style="color:#55aaff;font-weight:bold;">※気になる場合は医療機関で相談を。</span>`
};

const CB_MATRICES = {
  normal:      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protanopia:  [[0.56667, 0.43333, 0], [0.55833, 0.44167, 0], [0, 0.24167, 0.75833]],
  deuteranopia:[[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
  tritanopia:  [[0.95, 0.05, 0], [0, 0.43333, 0.56667], [0, 0.475, 0.525]]
};

// 序盤固定問題（体験用）
const FIXED_STAGES = [
  { base: [255, 68, 68],  diff: [68, 255, 68] },   // 赤-緑
  { base: [255, 255, 68], diff: [68, 255, 68] },   // 黄-緑
  { base: [255, 153, 187],diff: [187, 187, 187] }  // ピンク-灰
];

// ========================================================
// 2. ColorUtils - 色関連ロジックを完全分離
// ========================================================
class ColorUtils {
  static hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [
      Math.round(255 * f(0)),
      Math.round(255 * f(8)),
      Math.round(255 * f(4))
    ];
  }

  static applyMatrix(rgb, type) {
    const m = CB_MATRICES[type] || CB_MATRICES.normal;
    return [
      Math.round(rgb[0] * m[0][0] + rgb[1] * m[0][1] + rgb[2] * m[0][2]),
      Math.round(rgb[0] * m[1][0] + rgb[1] * m[1][1] + rgb[2] * m[1][2]),
      Math.round(rgb[0] * m[2][0] + rgb[1] * m[2][1] + rgb[2] * m[2][2])
    ];
  }

  static distance(a, b) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  static adjustBrightness(rgb, amount) {
    return rgb.map(v => Math.max(0, Math.min(255, v + amount)));
  }

  static toCss(rgb) {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  /**
   * 色覚タイプを意識した色ペア生成
   * - プロタン/デュータン: 赤緑方向のシフトを優先
   * - トリタン: 青黄方向を優先
   * - 最低距離をシミュレーション後に保証
   */
  static generatePair(difficulty, cbType) {
    const maxAttempts = 24;
    for (let i = 0; i < maxAttempts; i++) {
      let h = Math.floor(Math.random() * 360);
      const s = 55 + Math.floor(Math.random() * 35);
      const l = 35 + Math.floor(Math.random() * 35);

      // 色覚タイプに応じたシフト方向のバイアス
      let hueBias = 0;
      if (cbType === 'protanopia' || cbType === 'deuteranopia') {
        // 赤緑軸を意識して 0°/120° 付近を優先しやすくする
        hueBias = Math.random() < 0.55 ? (Math.random() < 0.5 ? 0 : 120) : h;
        h = hueBias + (Math.random() * 40 - 20);
      } else if (cbType === 'tritanopia') {
        hueBias = Math.random() < 0.5 ? 60 : 240;
        h = hueBias + (Math.random() * 50 - 25);
      }
      h = (h + 360) % 360;

      const base = this.hslToRgb(h, s, l);

      const hueShift = Math.max(4, Math.round(difficulty / 3.8));
      const lightShift = Math.max(5, Math.round(difficulty / 2.8));

      const newH = (h + (Math.random() < 0.5 ? hueShift : -hueShift) + 360) % 360;
      let newL = l + (Math.random() < 0.5 ? lightShift : -lightShift);
      newL = Math.max(10, Math.min(90, newL));

      const diff = this.hslToRgb(newH, s, newL);

      const simBase = this.applyMatrix(base, cbType);
      const simDiff = this.applyMatrix(diff, cbType);
      if (this.distance(simBase, simDiff) >= GAME_SETTINGS.MIN_COLOR_DISTANCE) {
        return { base, diff };
      }
    }

    // フォールバック（確実に差が出る）
    const h = Math.floor(Math.random() * 360);
    return {
      base: this.hslToRgb(h, 70, 48),
      diff: this.hslToRgb((h + 22) % 360, 70, 58)
    };
  }
}

// ========================================================
// 3. SoundManager
// ========================================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(freq, type, duration, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) { /* 安全に無視 */ }
  }

  playCorrect() {
    this.playTone(880, 'sine', 0.12, 0.1);
    setTimeout(() => this.playTone(1108.73, 'sine', 0.25, 0.1), 90);
  }

  playWrong() {
    this.playTone(150, 'sawtooth', 0.14, 0.1);
    setTimeout(() => this.playTone(140, 'sawtooth', 0.18, 0.1), 140);
  }

  playTimeout() {
    this.playTone(380, 'square', 0.45, 0.05);
  }

  playClear() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.28, 0.1), i * 140);
    });
  }
}

// ========================================================
// 4. UIManager
// ========================================================
class UIManager {
  constructor(gm) {
    this.gm = gm;
    this.dom = {
      container: document.getElementById('game-container'),
      board: document.getElementById('game-board'),
      startBtn: document.getElementById('start-btn'),
      resetBtn: document.getElementById('reset-btn'),
      resultMsg: document.getElementById('result-message'),
      qNum: document.getElementById('question-number'),
      score: document.getElementById('score'),
      combo: document.getElementById('combo'),
      hearts: document.getElementById('hearts'),
      timer: document.getElementById('timer'),
      advice: document.getElementById('advice-message'),
      familyQuestion: document.getElementById('family-question'),
      familyMessage: document.getElementById('family-message'),
      childYes: document.getElementById('child-yes-btn'),
      childNo: document.getElementById('child-no-btn'),
      cbButtons: document.querySelectorAll('#cb-mode-switcher button[data-type]'),
      cbTooltip: document.getElementById('cb-tooltip'),
      highlightBtn: document.getElementById('highlight-btn'),
      soundBtn: document.getElementById('sound-toggle-btn')
    };
    this.panels = [];
    this._buildBoard();
    this._bind();
  }

  _buildBoard() {
    this.dom.board.innerHTML = '';
    this.panels = [];
    for (let i = 0; i < GAME_SETTINGS.NUM_PANELS; i++) {
      const el = document.createElement('div');
      el.className = 'panel';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '-1');
      el.dataset.index = i;
      this.dom.board.appendChild(el);
      this.panels.push(el);
    }
  }

  _bind() {
    this.dom.startBtn.addEventListener('click', () => this.gm.start());
    this.dom.resetBtn.addEventListener('click', () => this.gm.reset());

    this.dom.cbButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.cbButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.gm.setCBType(btn.dataset.type);
        this.updateTooltip(btn.dataset.type);
      });
      btn.addEventListener('mouseenter', () => this.updateTooltip(btn.dataset.type));
      btn.addEventListener('mouseleave', () => this.updateTooltip(this.gm.cbType));
    });

    this.dom.highlightBtn.addEventListener('click', () => {
      const on = this.gm.toggleHighlight();
      this.dom.highlightBtn.textContent = on ? 'ON' : 'OFF';
      this.dom.highlightBtn.classList.toggle('active', on);
      this.dom.highlightBtn.setAttribute('aria-pressed', String(on));
    });

    this.dom.soundBtn.addEventListener('click', () => {
      this.gm.sound.init();
      const on = this.gm.sound.toggle();
      this.dom.soundBtn.textContent = on ? '🔊' : '🔇';
      this.dom.soundBtn.classList.toggle('muted', !on);
    });

    this.dom.childYes?.addEventListener('click', () => this.gm.onChildAnswer(true));
    this.dom.childNo?.addEventListener('click', () => this.gm.onChildAnswer(false));

    this.dom.board.addEventListener('click', e => {
      const p = e.target.closest('.panel');
      if (p) this.gm.select(Number(p.dataset.index));
    });

    this.dom.board.addEventListener('keydown', e => {
      if (!this.gm.active) return;
      if (e.key === 'Enter' || e.key === ' ') {
        const p = document.activeElement;
        if (p?.classList.contains('panel')) {
          e.preventDefault();
          this.gm.select(Number(p.dataset.index));
        }
      } else if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        this._nav(e.key);
      }
    });
  }

  _nav(key) {
    const cols = GAME_SETTINGS.GRID_SIZE;
    let idx = this.panels.findIndex(p => p === document.activeElement);
    if (idx < 0) { this.panels[0]?.focus(); return; }
    let next = idx;
    if (key === 'ArrowUp') next -= cols;
    if (key === 'ArrowDown') next += cols;
    if (key === 'ArrowLeft' && idx % cols !== 0) next--;
    if (key === 'ArrowRight' && idx % cols !== cols - 1) next++;
    if (next >= 0 && next < this.panels.length) this.panels[next].focus();
  }

  updateTooltip(type) {
    this.dom.cbTooltip.innerHTML = CB_TIPS[type] || '';
  }

  updateScore(v) { this.dom.score.textContent = v; }
  updateCombo(v) { this.dom.combo.textContent = v; }
  updateQuestion(q) { this.dom.qNum.textContent = `${q}/${GAME_SETTINGS.MAX_QUESTIONS}`; }
  updateTimer(ms) { this.dom.timer.textContent = (ms / 1000).toFixed(1); }

  renderHearts(lives) {
    const heart = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const broken = `<svg class="broken" viewBox="0 0 24 24"><path d="M13.45 3.13l-.2.23-.2-.23C12.46 2.52 11.76 2 11 2c-1.74 0-3.41.81-4.5 2.09C5.41 5.19 5 6.3 5 7.5c0 2.12 1.64 4.15 4.18 6.51l.47.43-.65.65-3.05-2.73c-1.04-.94-2.08-2-2.08-3.36 0-1.54 1.13-2.84 2.62-3.16.8-.18 1.63-.01 2.38.51L9.5 5.5l1.5-1.5-1.1-1.1c.6-.5 1.3-.7 2.1-.7.76 0 1.46.29 2.05.88l.2.23zM19.5 3c-1.74 0-3.41.81-4.5 2.09l-1.1 1.1 1.5 1.5L16 6.5l.38-.38c.75-.52 1.58-.69 2.38-.51 1.49.32 2.62 1.62 2.62 3.16 0 1.36-1.04 2.42-2.08 3.36l-3.05 2.73.65.65.47-.43C17.36 11.65 19 9.62 19 7.5c0-1.2-.41-2.31-1.5-3.41z"/></svg>`;
    this.dom.hearts.innerHTML = lives > 0
      ? heart.repeat(lives)
      : broken;
  }

  draw(panelsData) {
    panelsData.forEach((p, i) => {
      this.panels[i].style.backgroundColor = p.display;
      this.panels[i].classList.remove('wrong');
    });
  }

  shake() {
    this.dom.container.classList.add('shake');
    setTimeout(() => this.dom.container.classList.remove('shake'), 400);
  }

  shakePanel(i) { this.panels[i].classList.add('wrong'); }

  setInteractive(on) {
    this.dom.board.style.pointerEvents = on ? 'auto' : 'none';
    this.panels.forEach(p => p.tabIndex = on ? 0 : -1);
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

  setPlaying(playing) {
    this.dom.startBtn.classList.toggle('hidden', playing);
    this.dom.resetBtn.classList.toggle('hidden', !playing);
  }

  clearAnim(on) {
    document.body.classList.toggle('game-cleared', on);
    this.dom.container.classList.toggle('game-cleared', on);
    this.dom.resultMsg.classList.toggle('cleared', on);
  }

  showFamilyQuestion() {
    this.dom.familyMessage?.classList.add('hidden');
    this.dom.familyQuestion?.classList.remove('hidden');
  }

  showFamilyMessage() {
    this.dom.familyQuestion?.classList.add('hidden');
    this.dom.familyMessage?.classList.remove('hidden');
  }

  hideFamily() {
    this.dom.familyQuestion?.classList.add('hidden');
    this.dom.familyMessage?.classList.add('hidden');
  }

  showAdvice() {
    this.dom.advice.innerHTML = `
      このゲームは医療上の検査・診断を行うものではありません。<br>
      色の見え方は、画面設定・周囲の明るさ・体調・疲労などでも変わります。<br>
      日常生活で色の見分けに困ることが続く場合は、眼科などの医療機関へ相談してください。<br>
      <b>目は大切に！</b>👀✨
      <br><a href="https://www.gankaikai.or.jp/health/50/" target="_blank" rel="noopener" style="color:#1a73e8;text-decoration:underline">色覚異常について詳しく(日本眼科医会)</a>`;
    this.dom.advice.classList.remove('hidden');
  }

  hideAdvice() {
    this.dom.advice.innerHTML = '';
    this.dom.advice.classList.add('hidden');
  }
}

// ========================================================
// 5. GameManager
// ========================================================
class GameManager {
  constructor() {
    this.sound = new SoundManager();
    this.ui = new UIManager(this);

    this.cbType = 'normal';
    this.highlight = false;
    this.active = false;
    this.q = 1;
    this.score = 0;
    this.combo = 0;
    this.lives = GAME_SETTINGS.INITIAL_LIVES;
    this.target = -1;
    this.earlyMistakes = 0;
    this.panels = [];
    this.timerId = null;
    this.transId = null;
    this.startTime = 0;

    this.ui.updateTooltip(this.cbType);
    this.reset();
  }

  setCBType(type) {
    this.cbType = type;
    if (this.active) this._applyColors();
    else this.reset();
  }

  toggleHighlight() {
    this.highlight = !this.highlight;
    if (this.active) this._applyColors();
    return this.highlight;
  }

  _clearTimers() {
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    if (this.transId) { clearTimeout(this.transId); this.transId = null; }
  }

  _later(fn, ms) {
    this._clearTimers();
    this.transId = setTimeout(() => {
      this.transId = null;
      if (this.active) fn();
    }, ms);
  }

  start() {
    if (this.active) return;
    this._clearTimers();
    this.sound.init();
    this.active = true;
    this.score = 0;
    this.combo = 0;
    this.lives = GAME_SETTINGS.INITIAL_LIVES;
    this.q = 1;
    this.earlyMistakes = 0;
    this.startTime = Date.now();

    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.renderHearts(this.lives);
    this.ui.hideResult();
    this.ui.hideAdvice();
    this.ui.hideFamily();
    this.ui.clearAnim(false);
    this.ui.setPlaying(true);
    this._nextQuestion();
  }

  reset() {
    this._clearTimers();
    this.active = false;
    this.q = 1;
    this.score = 0;
    this.combo = 0;
    this.lives = GAME_SETTINGS.INITIAL_LIVES;
    this.earlyMistakes = 0;

    this.ui.updateQuestion(1);
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.renderHearts(this.lives);
    this.ui.updateTimer(GAME_SETTINGS.TIMER_DURATION_MS);
    this.ui.hideResult();
    this.ui.hideAdvice();
    this.ui.hideFamily();
    this.ui.clearAnim(false);
    this.ui.setPlaying(false);
    this.ui.setInteractive(false);

    this.panels = Array(GAME_SETTINGS.NUM_PANELS).fill(null).map(() => ({ display: '#ccc' }));
    this.ui.draw(this.panels);
  }

  _difficulty() {
    if (this.q <= 8) return 52 - (this.q - 4) * 5.5;
    if (this.q <= 12) return 26 - (this.q - 9) * 3.5;
    return [13, 10, 7][this.q - 13] || 7;
  }

  _nextQuestion() {
    if (!this.active) return;
    if (this.lives <= 0) return this._end('over');
    if (this.q > GAME_SETTINGS.MAX_QUESTIONS) return this._end('clear');

    this.ui.updateQuestion(this.q);
    this.ui.hideResult();

    let base, diff;
    if (this.q <= FIXED_STAGES.length) {
      ({ base, diff } = FIXED_STAGES[this.q - 1]);
    } else {
      ({ base, diff } = ColorUtils.generatePair(this._difficulty(), this.cbType));
    }

    this.target = Math.floor(Math.random() * GAME_SETTINGS.NUM_PANELS);
    this.panels = [];
    for (let i = 0; i < GAME_SETTINGS.NUM_PANELS; i++) {
      this.panels.push({
        raw: i === this.target ? diff : base,
        isTarget: i === this.target,
        display: '#ccc'
      });
    }

    this._applyColors();
    this.ui.setInteractive(true);
    this._startTimer();
  }

  _applyColors() {
    const highlightMap = { protanopia: 1, deuteranopia: 2, tritanopia: 3 };
    const doHighlight = this.highlight && highlightMap[this.cbType] === this.q;

    this.panels.forEach(p => {
      let sim = ColorUtils.applyMatrix(p.raw, this.cbType);
      if (doHighlight && p.isTarget) sim = ColorUtils.adjustBrightness(sim, 48);
      p.display = ColorUtils.toCss(sim);
    });
    this.ui.draw(this.panels);
  }

  select(index) {
    if (!this.active) return;
    this._clearTimers();
    this.ui.setInteractive(false);

    const correct = index === this.target;
    const isFixed = this.q <= FIXED_STAGES.length;

    if (correct) {
      this.sound.playCorrect();
      this.combo++;
      const bonus = (this.combo - 1) * GAME_SETTINGS.COMBO_BONUS;
      this.score += GAME_SETTINGS.SCORE_PER_CORRECT + bonus;
      this.ui.updateScore(this.score);
      this.ui.updateCombo(this.combo);
      this.ui.showResult(
        this.combo > 1 ? `正解！ コンボ×${this.combo} ✨` : '正解！✨',
        '#4CAF50'
      );
      this.q++;
      this._later(() => this._nextQuestion(), GAME_SETTINGS.RESULT_DISPLAY_DELAY);
    } else {
      this.sound.playWrong();
      this.combo = 0;
      this.ui.updateCombo(0);
      this.ui.shakePanel(index);
      this.ui.shake();
      this.ui.showResult('不正解... 💧', '#f44336');
      if (isFixed) this.earlyMistakes++;
      this._mistake();
    }
  }

  _mistake() {
    this.lives--;
    this.ui.renderHearts(this.lives);
    if (this.lives <= 0) {
      this._later(() => this._end('over'), GAME_SETTINGS.RESULT_DISPLAY_DELAY);
    } else {
      this._later(() => this._nextQuestion(), GAME_SETTINGS.RESULT_DISPLAY_DELAY * 0.75);
    }
  }

  _startTimer() {
    this._clearTimers();
    const endAt = Date.now() + GAME_SETTINGS.TIMER_DURATION_MS;
    this.ui.updateTimer(GAME_SETTINGS.TIMER_DURATION_MS);

    this.timerId = setInterval(() => {
      const left = endAt - Date.now();
      if (left <= 0) {
        this._clearTimers();
        this.ui.updateTimer(0);
        this._timeout();
      } else {
        this.ui.updateTimer(left);
      }
    }, 80);
  }

  _timeout() {
    if (!this.active) return;
    this.sound.playTimeout();
    this.combo = 0;
    this.ui.updateCombo(0);
    this.ui.setInteractive(false);
    this.ui.showResult('時間切れ！ ⏳', '#ff9800');
    if (this.q <= FIXED_STAGES.length) this.earlyMistakes++;
    this._mistake();
  }

  _end(type) {
    if (!this.active) return;
    this._clearTimers();
    this.active = false;
    this.ui.setInteractive(false);
    this.ui.setPlaying(false);

    if (type === 'clear') {
      this.sound.playClear();
      const sec = ((Date.now() - this.startTime) / 1000).toFixed(1);
      this.ui.showResult(`🏆 全問正解！おめでとう！ 🏆<br>スコア: ${this.score}<br>タイム: ${sec}秒`, '#9c27b0');
      this.ui.clearAnim(true);
    } else {
      this.ui.showResult(`ゲームオーバー... スコア: ${this.score}`, '#333');
    }

    // 結果を少し見せてから家族質問へ（自然な流れ）
    setTimeout(() => {
      this.ui.showFamilyQuestion();
    }, GAME_SETTINGS.FAMILY_QUESTION_DELAY);
  }

  onChildAnswer(isChild) {
    this.ui.hideFamily();
    if (isChild) {
      this.ui.showFamilyMessage();
      setTimeout(() => this.ui.showAdvice(), 550);
    } else if (this.earlyMistakes >= 2) {
      this.ui.showAdvice();
    }
  }
}

// 起動
document.addEventListener('DOMContentLoaded', () => {
  window.game = new GameManager();
});
