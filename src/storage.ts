/**
 * Persistence: bundled sets + localStorage.
 *
 * BUG FIX: The original loadSets() would drop bundled sets when user sets
 * existed. Now we always keep bundled sets and merge user sets separately.
 *
 * BUG FIX: saveSets() now only persists user (non-bundled) sets to avoid
 * bloating localStorage with read-only bundled data.
 */

import { sets, setSets } from './state';
import type { FlashCardSet } from './types';

export function loadBundledSets(): void {
  if (typeof bundledSetsData !== 'undefined' && Array.isArray(bundledSetsData)) {
    const bundled = bundledSetsData.map((s) => ({ ...s, bundled: true as const }));
    setSets([...bundled, ...sets]);
  }
}

export function loadSets(): void {
  const saved = localStorage.getItem('flashcardSets');
  if (!saved) return;

  try {
    const userSets: FlashCardSet[] = JSON.parse(saved);
    // Keep bundled sets, append user sets (filtering out any stale bundled copies)
    const bundled = sets.filter((s) => s.bundled);
    const clean = userSets.filter((s) => !s.bundled);
    setSets([...bundled, ...clean]);
  } catch (e) {
    console.warn('Failed to parse saved sets:', e);
  }
}

export function saveSets(): void {
  const userSets = sets.filter((s) => !s.bundled);
  localStorage.setItem('flashcardSets', JSON.stringify(userSets));
}
