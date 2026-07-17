(() => {
  'use strict';

  function initializeColorModeAccessibility() {
    const buttons = document.querySelectorAll('#cb-mode-switcher button[data-type]');
    if (buttons.length === 0) return;

    function syncPressedState() {
      buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
      });
    }

    buttons.forEach(button => {
      button.addEventListener('click', syncPressedState);
    });

    syncPressedState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeColorModeAccessibility, { once: true });
  } else {
    initializeColorModeAccessibility();
  }
})();
