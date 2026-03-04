/**
 * View management with URL hash routing.
 *
 * This module handles switching between views, hash-based navigation,
 * and PWA bottom-nav state. It exposes a callback hook so other modules
 * (gamepad, study setup restore) can react without creating circular deps.
 */

let isUpdatingHash = false;
let viewChangeCallbacks: ((viewId: string, previousId: string) => void)[] = [];

const VIEW_HASH_MAP: Record<string, string> = {
  mainView: '',
  setEditorView: 'creator',
  studySetupView: 'study',
  studyView: 'study',
  resultsView: 'study',
  settingsView: 'settings',
};

export function onViewChange(cb: (viewId: string, previousId: string) => void): void {
  viewChangeCallbacks.push(cb);
}

export function getCurrentViewId(): string {
  return document.querySelector('.view.active')?.id || 'mainView';
}

export function showView(viewId: string, updateHash = true): void {
  const previousId = getCurrentViewId();

  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');

  updatePwaNavActive(viewId);

  if (updateHash && !isUpdatingHash) {
    const hash = VIEW_HASH_MAP[viewId] ?? '';
    if (hash) {
      window.location.hash = hash;
    } else if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  for (const cb of viewChangeCallbacks) cb(viewId, previousId);
}

export function handleHashChange(): void {
  isUpdatingHash = true;
  const hash = window.location.hash.substring(1);

  if (hash === 'creator') {
    showView('setEditorView', false);
  } else if (hash === 'study') {
    const studyActive = document.getElementById('studyView')?.classList.contains('active');
    const resultsActive = document.getElementById('resultsView')?.classList.contains('active');
    if (!studyActive && !resultsActive) {
      showView('studySetupView', false);
    }
  } else if (hash === 'settings') {
    showView('settingsView', false);
  } else {
    showView('mainView', false);
  }

  isUpdatingHash = false;
}

function getPwaNavActiveView(viewId: string): string {
  if (viewId === 'studySetupView' || viewId === 'studyView' || viewId === 'resultsView')
    return 'studySetupView';
  return viewId;
}

export function updatePwaNavActive(viewId?: string): void {
  const nav = document.getElementById('pwaBottomNav');
  if (!nav) return;
  const activeView = getPwaNavActiveView(viewId || getCurrentViewId());
  nav.querySelectorAll<HTMLButtonElement>('.pwa-nav-btn').forEach((btn) => {
    const v = btn.dataset.view;
    btn.classList.toggle('active', v === activeView);
    if (v === activeView) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
}
