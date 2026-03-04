/**
 * View management with URL hash routing.
 *
 * This module handles switching between views, hash-based navigation,
 * and PWA bottom-nav state. It exposes a callback hook so other modules
 * (gamepad, study setup restore) can react without creating circular deps.
 */

import { ViewId } from './constants';

let isUpdatingHash = false;
let viewChangeCallbacks: ((viewId: string, previousId: string) => void)[] = [];

const VIEW_HASH_MAP: Record<string, string> = {
  [ViewId.MAIN]: '',
  [ViewId.EDITOR]: 'creator',
  [ViewId.STUDY_SETUP]: 'study',
  [ViewId.STUDY]: 'study',
  [ViewId.RESULTS]: 'study',
  [ViewId.SETTINGS]: 'settings',
};

export function onViewChange(cb: (viewId: string, previousId: string) => void): void {
  viewChangeCallbacks.push(cb);
}

export function getCurrentViewId(): string {
  return document.querySelector('.view.active')?.id || ViewId.MAIN;
}

export function showView(viewId: string, updateHash = true): void {
  const previousId = getCurrentViewId();

  document.querySelectorAll('.view').forEach((v) => {
    v.classList.remove('active');
    v.setAttribute('aria-hidden', 'true');
  });
  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.add('active');
    activeView.removeAttribute('aria-hidden');
  }

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
    showView(ViewId.EDITOR, false);
  } else if (hash === 'study') {
    const studyActive = document.getElementById(ViewId.STUDY)?.classList.contains('active');
    const resultsActive = document.getElementById(ViewId.RESULTS)?.classList.contains('active');
    if (!studyActive && !resultsActive) {
      showView(ViewId.STUDY_SETUP, false);
    }
  } else if (hash === 'settings') {
    showView(ViewId.SETTINGS, false);
  } else {
    showView(ViewId.MAIN, false);
  }

  isUpdatingHash = false;
}

function getPwaNavActiveView(viewId: string): string {
  if (viewId === ViewId.STUDY_SETUP || viewId === ViewId.STUDY || viewId === ViewId.RESULTS)
    return ViewId.STUDY_SETUP;
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
