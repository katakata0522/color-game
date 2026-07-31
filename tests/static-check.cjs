const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const noticeCss = fs.readFileSync(path.join(root, 'notice.css'), 'utf8');
const themeSafety = fs.readFileSync(path.join(root, 'theme-safety.js'), 'utf8');
const accessibility = fs.readFileSync(path.join(root, 'accessibility.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

const gameScriptPosition = html.indexOf('src="script.js"');
const safetyScriptPosition = html.indexOf('src="theme-safety.js"');
const accessibilityScriptPosition = html.indexOf('src="accessibility.js"');

assert.ok(html.includes('id="theme-toggle-btn"'), 'テーマ切替ボタンがありません');
assert.ok(html.includes('id="app-status"'), 'エラー状態表示がありません');
assert.ok(html.includes('<h1>色の見え方体験ゲーム</h1>'), 'ゲーム用途の名称になっていません');
assert.ok(html.includes('class="experience-notice"'), '開始前の注意表示がありません');
assert.ok(html.includes('医療上の検査・診断・判定には使用できません'), '非診断用途の説明がありません');
assert.ok(html.includes('href="notice.css"'), '注意表示のCSSが読み込まれていません');
assert.ok(html.includes('id="cb-mode-switcher" role="group" aria-label="簡易表示シミュレーション"'), '色表示切替が支援技術向けのグループになっていません');
assert.ok(html.includes('data-type="normal" class="selected" aria-pressed="true"'), '初期選択モードが支援技術へ伝わりません');
assert.equal((html.match(/aria-pressed="false"/g) || []).length >= 4, true, '未選択ボタンの初期状態が不足しています');
assert.ok(!/<title>[^<]*色覚検定/.test(html), 'titleに検定表記が残っています');
assert.ok(!/<h1>[^<]*色覚検定/.test(html), '見出しに検定表記が残っています');
assert.ok(gameScriptPosition >= 0, 'script.jsが読み込まれていません');
assert.ok(safetyScriptPosition > gameScriptPosition, 'theme-safety.jsはSoundManager定義後に読み込む必要があります');
assert.ok(accessibilityScriptPosition > safetyScriptPosition, 'accessibility.jsはゲームと安全処理の後に読み込む必要があります');
assert.ok(css.includes('html[data-theme="dark"]'), 'ダークテーマのCSSがありません');
assert.ok(css.includes('prefers-reduced-motion'), '動きを減らす設定への対応がありません');
assert.ok(noticeCss.includes('html[data-theme="dark"] .experience-notice'), '注意表示のダークテーマ対応がありません');
assert.ok(themeSafety.includes("const THEME_STORAGE_KEY = 'colorGameTheme'"), 'テーマ保存キーが想定と異なります');
assert.ok(themeSafety.includes("matchMedia('(prefers-color-scheme: dark)')"), 'システムテーマの参照がありません');
assert.ok(themeSafety.includes("typeof SoundManager !== 'undefined'"), '音声機能の安全対策がありません');
assert.ok(accessibility.includes("button.setAttribute('aria-pressed', String(button.classList.contains('selected')))"), '色表示の選択状態がARIAへ同期されません');
assert.ok(readme.includes('医療上の検査、診断、判定、スクリーニングには使用できません'), 'READMEに用途制限がありません');

// 新機能チェック
assert.ok(html.includes('id="family-question"'), '家族確認UIがありません');
assert.ok(html.includes('id="family-message"'), '家族向けメッセージUIがありません');
assert.ok(html.includes('id="child-yes-btn"'), '子供「はい」ボタンがありません');
assert.ok(html.includes('id="combo"'), 'コンボ表示がありません');
assert.ok(script.includes('COMBO_BONUS'), 'コンボボーナス設定がありません');
assert.ok(script.includes('ColorUtils'), 'ColorUtilsクラスがありません');
assert.ok(script.includes('generatePair'), '色生成関数がありません');
assert.ok(script.includes('onChildAnswer'), '家族導線の回答処理がありません');
assert.ok(css.includes('.family-section'), '家族導線のスタイルがありません');
assert.ok(script.includes('FAMILY_QUESTION_DELAY'), '家族質問の遅延設定がありません');

// v5.3 ΔE チェック
assert.ok(script.includes('rgbToLab'), 'rgbToLab（LAB変換）がありません');
assert.ok(script.includes('deltaE'), 'deltaE（CIE76）がありません');
assert.ok(script.includes('deltaEAfterSimulation'), 'シミュレーション後ΔE計算がありません');
assert.ok(readme.includes('CIE76') || readme.includes('ΔE'), 'READMEにΔEの記載がありません');

console.log('v5.3 静的確認完了（安全・ARIA・家族導線・ColorUtils・CIE76 ΔE）');
