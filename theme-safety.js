(() => {
  'use strict';

  const THEME_STORAGE_KEY = 'colorGameTheme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let manualTheme = null;

  function readStoredTheme() {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      console.warn('テーマ設定を読み込めませんでした。', error);
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('テーマ設定を保存できませんでした。', error);
    }
  }

  function getSystemTheme() {
    return systemTheme.matches ? 'dark' : 'light';
  }

  function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle-btn');
    if (!button) return;

    const isDark = theme === 'dark';
    button.textContent = isDark ? '☀️' : '🌙';
    button.setAttribute('aria-label', isDark ? 'ライトモードへ切り替える' : 'ダークモードへ切り替える');
    button.setAttribute('aria-pressed', String(isDark));
  }

  function applyTheme(theme) {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = safeTheme;
    updateThemeButton(safeTheme);
  }

  function showSafetyMessage(message) {
    const status = document.getElementById('app-status');
    if (!status) return;
    status.textContent = message;
    status.classList.remove('hidden');
  }

  manualTheme = readStoredTheme();
  applyTheme(manualTheme || getSystemTheme());

  systemTheme.addEventListener('change', event => {
    if (!manualTheme) applyTheme(event.matches ? 'dark' : 'light');
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateThemeButton(document.documentElement.dataset.theme);

    const button = document.getElementById('theme-toggle-btn');
    if (button) {
      button.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        manualTheme = nextTheme;
        saveTheme(nextTheme);
        applyTheme(nextTheme);
      });
    }
  });

  if (typeof SoundManager !== 'undefined') {
    const originalPlayTone = SoundManager.prototype.playTone;

    SoundManager.prototype.init = function() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        this.audioCtx = null;
        this.enabled = false;
        return false;
      }

      try {
        if (!this.audioCtx) this.audioCtx = new AudioContextClass();
        if (this.audioCtx.state === 'suspended') {
          const resumeResult = this.audioCtx.resume();
          if (resumeResult && typeof resumeResult.catch === 'function') {
            resumeResult.catch(error => console.warn('音声の再開に失敗しました。', error));
          }
        }
        return true;
      } catch (error) {
        console.warn('音声機能を初期化できませんでした。', error);
        this.audioCtx = null;
        this.enabled = false;
        return false;
      }
    };

    SoundManager.prototype.toggle = function() {
      if (!window.AudioContext && !window.webkitAudioContext) {
        this.enabled = false;
        return false;
      }
      this.enabled = !this.enabled;
      return this.enabled;
    };

    SoundManager.prototype.playTone = function(...args) {
      try {
        return originalPlayTone.apply(this, args);
      } catch (error) {
        console.warn('効果音を再生できませんでした。', error);
        this.audioCtx = null;
        return undefined;
      }
    };
  }

  window.addEventListener('error', event => {
    console.error('Color game runtime error:', event.error || event.message);
    showSafetyMessage('一部の処理でエラーが発生しました。ページを再読み込みしてください。');
  });

  window.addEventListener('unhandledrejection', event => {
    console.error('Color game unhandled rejection:', event.reason);
    showSafetyMessage('一部の処理を完了できませんでした。通信環境を確認して再度お試しください。');
  });
})();
