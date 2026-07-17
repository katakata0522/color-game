const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const themeSafety = fs.readFileSync(path.join(root, 'theme-safety.js'), 'utf8');

const gameScriptPosition = html.indexOf('src="script.js"');
const safetyScriptPosition = html.indexOf('src="theme-safety.js"');

assert.ok(html.includes('id="theme-toggle-btn"'), 'テーマ切替ボタンがありません');
assert.ok(html.includes('id="app-status"'), 'エラー状態表示がありません');
assert.ok(gameScriptPosition >= 0, 'script.jsが読み込まれていません');
assert.ok(safetyScriptPosition > gameScriptPosition, 'theme-safety.jsはSoundManager定義後に読み込む必要があります');
assert.ok(css.includes('html[data-theme="dark"]'), 'ダークテーマのCSSがありません');
assert.ok(css.includes('prefers-reduced-motion'), '動きを減らす設定への対応がありません');
assert.ok(themeSafety.includes("const THEME_STORAGE_KEY = 'colorGameTheme'"), 'テーマ保存キーが想定と異なります');
assert.ok(themeSafety.includes("matchMedia('(prefers-color-scheme: dark)')"), 'システムテーマの参照がありません');
assert.ok(themeSafety.includes("typeof SoundManager !== 'undefined'"), '音声機能の安全対策がありません');

console.log('ダークモードと安全対策の静的確認が完了しました');
