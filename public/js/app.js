/* ============================================================
   Finance Tracker — Client-side interactivity
   ============================================================ */

(function () {
  // ---------- Theme toggle ----------
  const toggle = document.getElementById('theme-toggle');
  const icon = toggle?.querySelector('.theme-icon');

  function syncIcon() {
    if (!icon) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    icon.textContent = isDark ? '☀️' : '🌙';
  }

  syncIcon();

  toggle?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncIcon();
  });

  // ---------- Toast helper ----------
  const container = document.getElementById('toast-container');

  function toast(message, type = 'info', duration = 3200) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const glyph = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    el.innerHTML = `<span>${glyph}</span><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('fade-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
  }

  window.ft = { toast };

  // ---------- Auto-dismiss server-side flash (if you add any) ----------
  document.querySelectorAll('[data-toast]').forEach((el) => {
    toast(el.getAttribute('data-toast'), el.getAttribute('data-toast-type') || 'info');
  });

  // ---------- Loading state for buttons that trigger form submits ----------
  document.querySelectorAll('form[data-loading] button[type="submit"]').forEach((btn) => {
    const form = btn.closest('form');
    form.addEventListener('submit', () => {
      btn.classList.add('is-loading');
      btn.disabled = true;
    });
  });

  // ---------- Delete confirmation with toast feedback ----------
  document.querySelectorAll('form[action*="/delete"]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Delete this transaction?')) {
        e.preventDefault();
      } else {
        toast('Transaction deleted', 'info', 2000);
      }
    });
  });
})();