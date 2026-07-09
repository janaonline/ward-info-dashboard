export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function fmt(n, d = 0) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function cov100(c) {
  if (c == null || isNaN(c)) return null;
  return Math.max(0, Math.min(100, c));
}

export function tc(s) {
  if (!s) return s;
  return String(s).split(/\s+/).map(t => {
    if (!t) return t;
    if (t.indexOf('.') >= 0) return t.charAt(0).toUpperCase() + t.slice(1);
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }).join(' ');
}
