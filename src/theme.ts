const THEME_META_COLORS: Record<string, string> = {
  dark: '#0a0a0a',
  light: '#1a1a1a',
  ocean: '#0d2137',
  forest: '#0f1f14',
  sunset: '#2d1b2e',
};

export function applyTheme(theme?: string): void {
  const resolved = theme || localStorage.getItem('appTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', resolved);

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta && THEME_META_COLORS[resolved]) {
    meta.setAttribute('content', THEME_META_COLORS[resolved]);
  }

  const mainSelect = document.getElementById('themeSelectMain') as HTMLSelectElement | null;
  const settingsSelect = document.getElementById('themeSelectSettings') as HTMLSelectElement | null;
  if (mainSelect) mainSelect.value = resolved;
  if (settingsSelect) settingsSelect.value = resolved;
}

export function setTheme(theme: string): void {
  localStorage.setItem('appTheme', theme);
  applyTheme(theme);
}
