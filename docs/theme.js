// Shared, accessible theme switcher for both site and profile pages.
const STORAGE_KEY = 'ntlab-theme';
const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
const readPreference = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};
const savePreference = choice => {
  try { localStorage.setItem(STORAGE_KEY, choice); } catch { /* Storage may be disabled. */ }
};
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1621' : '#f4f8f3');
  document.querySelectorAll('.theme-toggle').forEach(button => {
    button.setAttribute('aria-checked', String(theme === 'light'));
    button.setAttribute('aria-label', theme === 'dark' ? 'فعال‌کردن حالت روشن' : 'فعال‌کردن حالت تاریک');
    button.title = theme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک';
    const label = button.querySelector('.theme-toggle-label');
    if (label) label.textContent = theme === 'dark' ? 'حالت تاریک' : 'حالت روشن';
  });
}
export function initTheme() {
  const stored = readPreference();
  applyTheme(stored === 'light' || stored === 'dark' ? stored : systemPreference.matches ? 'dark' : 'light');
  document.querySelectorAll('.theme-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      savePreference(next);
      applyTheme(next);
    });
  });
  const handleSystemChange = event => {
    if (!['light', 'dark'].includes(readPreference())) applyTheme(event.matches ? 'dark' : 'light');
  };
  systemPreference.addEventListener?.('change', handleSystemChange);
}
