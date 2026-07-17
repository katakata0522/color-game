const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const noticeCss = fs.readFileSync(path.join(root, 'notice.css'), 'utf8');
const themeSafety = fs.readFileSync(path.join(root, 'theme-safety.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

const gameScriptPosition = html.indexOf('src="script.js"');
const safetyScriptPosition = html.indexOf('src="theme-safety.js"');

assert.ok(html.includes('id="theme-toggle-btn"'), 'テーマ切替ボタンがありません');
assert.ok(html.includes('id="app-status"'), 'エラー状態表示がありません');
assert.ok(html.includes('<h1>色の見え方体験ゲーム</h1>'), 'ゲーム用途の名称になっていません');
assert.ok(html.includes('class="experience-notice"'), '開始前の注意表示がありません');
assert.ok(html.includes('医療上の検査・診断・判定には使用できません'), '非診断用途の説明がありません');
assert.ok(html.includes('href="notice.css"'), '注意表示のCSSが読み込まれていません');
assert.ok(!/<title>[^<]*色覚検定/.test(html), 'titleに検定表記が残っています');
assert.ok(!/<h1>[^<]*色覚検定/.test(html), '見出しに検定表記が残っています');
assert.ok(gameScriptPosition >= 0, 'script.jsが読み込まれていません');
assert.ok(safetyScriptPosition > gameScriptPosition, 'theme-safety.jsはSoundManager定義後に読み込む必要があります');
assert.ok(css.includes('html[data-theme="dark"]'), 'ダークテーマのCSSがありません');
assert.ok(css.includes('prefers-reduced-motion'), '動きを減らす設定への対応がありません');
assert.ok(noticeCss.includes('html[data-theme="dark"] .experience-notice'), '注意表示のダークテーマ対応がありません');
assert.ok(themeSafety.includes("const THEME_STORAGE_KEY = 'colorGameTheme'"), 'テーマ保存キーが想定と異なります');
assert.ok(themeSafety.includes("matchMedia('(prefers-color-scheme: dark)')"), 'システムテーマの参照がありません');
assert.ok(themeSafety.includes("typeof SoundManager !== 'undefined'"), '音声機能の安全対策がありません');
assert.ok(readme.includes('医療上の検査、診断、判定、スクリーニングには使用できません'), 'READMEに用途制限がありません');
assert.ok(readme.includes('色変換行列'), 'READMEに色表示の限界がありません');

console.log('ダークモード・安全対策・非診断表示の静的確認が完了しました');
