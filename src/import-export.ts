import { sets } from './state';
import { saveSets } from './storage';
import { renderSets } from './render';
import type { FlashCardSet } from './types';

export function exportSet(index: number): void {
  const set = sets[index];
  const data: Record<string, unknown> = {
    name: set.name,
    cards: set.cards,
    exportedAt: new Date().toISOString(),
  };
  if (set.year != null && set.year !== '') data.year = set.year;
  if (set.creator) data.creator = set.creator;
  if (set.subject) data.subject = set.subject;
  if (set.color) data.color = set.color;
  if (set.rounds?.length) data.rounds = set.rounds;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${set.name.replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function handleImport(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target!.result as string);
      if (!raw.name || !Array.isArray(raw.cards)) {
        alert('Invalid file format');
        return;
      }

      const setData: FlashCardSet = { name: raw.name, cards: raw.cards };
      if (raw.year != null && raw.year !== '') setData.year = raw.year;
      if (raw.creator) setData.creator = raw.creator;
      if (raw.subject) setData.subject = raw.subject;
      if (raw.color && /^#[0-9A-Fa-f]{6}$/.test(raw.color)) setData.color = raw.color;
      if (Array.isArray(raw.rounds) && raw.rounds.length > 0) setData.rounds = raw.rounds;

      sets.push(setData);
      saveSets();
      renderSets();
      alert('Set imported successfully!');
    } catch {
      alert('Error importing file. Please ensure it is a valid JSON file.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}
