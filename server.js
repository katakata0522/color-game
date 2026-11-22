'use strict';

const express = require('express');
const path = require('node:path');

// 静的ファイルを配信するための軽量Expressサーバー
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// 公開を許可する静的ファイルの一覧
const PUBLIC_FILES = new Set([
  '/index.html',
  '/style.css',
  '/notice.css',
  '/script.js',
  '/theme-safety.js',
  '/accessibility.js'
]);

app.disable('x-powered-by');

// ルートアクセス時に index.html を返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 許可された静的ファイルのみ配信（設定ファイルやサーバーコードの露出を防止）
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }
  if (!PUBLIC_FILES.has(req.path)) {
    return res.status(404).send('Not Found');
  }
  return next();
});

app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  etag: true,
  index: 'index.html'
}));

const server = app.listen(PORT, HOST, () => {
  console.log(`色の見え方体験ゲーム サーバーを起動しました: http://${HOST}:${PORT}`);
});

// 終了シグナル時の安全なクローズ処理
function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
