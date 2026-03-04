/**
 * Render the sets list on the main view.
 *
 * Uses data-attribute event delegation instead of inline onclick handlers.
 */

import { ViewId } from './constants';
import { sets } from './state';
import { escapeHtml, formatYearDisplay } from './utils';
import { showView } from './views';
import { editSet } from './editor';
import { exportSet } from './import-export';
import { deleteSetFromList, copyBundledSetToUser } from './editor';

function buildMetaText(set: (typeof sets)[0]): string {
  const parts: string[] = [];
  parts.push(`${set.cards.length} card${set.cards.length !== 1 ? 's' : ''}`);
  if (set.rounds?.length) {
    parts.push(`${set.rounds.length} round${set.rounds.length !== 1 ? 's' : ''}`);
  }
  const yr = formatYearDisplay(set.year);
  if (yr) parts.push(yr);
  if (set.creator) parts.push(escapeHtml(set.creator));
  if (set.subject) parts.push(escapeHtml(set.subject));
  return parts.join(' • ');
}

function colorDotHtml(set: (typeof sets)[0]): string {
  if (!set.color) return '';
  const valid = /^#[0-9A-Fa-f]{6}$/.test(String(set.color));
  const style = valid ? ` style="background:${escapeHtml(String(set.color))}"` : '';
  return `<div class="set-item-color"${style} aria-hidden="true"></div>`;
}

export function renderSets(): void {
  const setsList = document.getElementById('setsList')!;
  const bundledSetsList = document.getElementById('bundledSetsList')!;
  const bundledContainer = document.getElementById('bundledSetsContainer')!;
  const studyBtn = document.getElementById('studyBtn') as HTMLButtonElement;

  const bundled = sets.filter((s) => s.bundled);
  const user = sets.filter((s) => !s.bundled);

  // ── Bundled sets ──
  if (bundled.length > 0) {
    bundledContainer.style.display = 'block';
    bundledSetsList.innerHTML = '';
    bundled.forEach((set) => {
      const idx = sets.indexOf(set);
      const item = document.createElement('div');
      item.className = 'set-item bundled-set';
      item.innerHTML = `
        ${colorDotHtml(set)}
        <div class="set-info">
          <div class="set-name">${escapeHtml(set.name)}</div>
          <div class="set-meta">${buildMetaText(set)}</div>
        </div>
        <div class="set-actions">
          <button class="btn btn-secondary btn-icon" data-action="copy" data-index="${idx}">Copy</button>
          <button class="btn btn-secondary btn-icon" data-action="export" data-index="${idx}">Export</button>
        </div>`;
      bundledSetsList.appendChild(item);
    });
  } else {
    bundledContainer.style.display = 'none';
  }

  // ── User sets ──
  if (user.length === 0) {
    setsList.innerHTML =
      '<p class="empty-message">No sets yet. Create your first set to get started!</p>';
  } else {
    setsList.innerHTML = '';
    user.forEach((set) => {
      const idx = sets.indexOf(set);
      const item = document.createElement('div');
      item.className = 'set-item';
      item.innerHTML = `
        ${colorDotHtml(set)}
        <div class="set-info" data-action="edit" data-index="${idx}">
          <div class="set-name">${escapeHtml(set.name)}</div>
          <div class="set-meta">${buildMetaText(set)}</div>
        </div>
        <div class="set-actions">
          <button class="btn btn-secondary btn-icon" data-action="edit" data-index="${idx}">Edit</button>
          <button class="btn btn-secondary btn-icon" data-action="export" data-index="${idx}">Export</button>
          <button class="btn btn-danger btn-icon" data-action="delete" data-index="${idx}">Delete</button>
        </div>`;
      setsList.appendChild(item);
    });
  }

  studyBtn.disabled = sets.length === 0;
}

/** Wire event delegation for set list actions. Call once at init. */
export function setupSetListDelegation(): void {
  const handler = (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const index = Number(target.dataset.index);
    if (isNaN(index)) return;

    switch (action) {
      case 'edit':
        editSet(index);
        break;
      case 'export':
        exportSet(index);
        break;
      case 'delete':
        deleteSetFromList(index);
        break;
      case 'copy':
        copyBundledSetToUser(index);
        break;
      case 'study':
        showView(ViewId.STUDY_SETUP);
        break;
    }
  };

  document.getElementById('setsList')?.addEventListener('click', handler);
  document.getElementById('bundledSetsList')?.addEventListener('click', handler);
}
