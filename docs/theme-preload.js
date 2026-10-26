// Runs before CSS to avoid a flash of the wrong color theme.
(() => {
  let choice;
  try { choice = localStorage.getItem('ntlab-theme'); } catch {}
  const preferred = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = ['light','dark'].includes(choice) ? choice : preferred;
})();
