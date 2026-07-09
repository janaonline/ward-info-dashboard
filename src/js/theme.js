const STORAGE_KEY = 'kyw-theme';
const listeners = new Set();

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  listeners.forEach(fn => fn(theme));
}

export function onThemeChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function toggleTheme(x, y) {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';

  const root = document.documentElement;
  root.style.setProperty('--ripple-x', `${x}px`);
  root.style.setProperty('--ripple-y', `${y}px`);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.startViewTransition || prefersReduced) {
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    return;
  }

  const transition = document.startViewTransition(() => {
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  transition.ready.then(() => {
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
      { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
}

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const initial = stored || (systemPrefersDark() ? 'dark' : 'light');
  applyTheme(initial);

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      toggleTheme(x, y);
    });
  }
}
