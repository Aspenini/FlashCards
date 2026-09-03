import { loadBundledSets } from '$lib/data/bundled';
import { validateImportedSet } from '$lib/domain/import-validation';
import { uid } from '$lib/domain/utils';
import type { FlashCardSet } from '$lib/types';
import { ui } from './ui.svelte';

const STORAGE_KEY = 'flashcardSets';

function ensureId(set: FlashCardSet, fallback?: string): FlashCardSet {
  if (set.id) return set;
  return { ...set, id: fallback ?? uid('set') };
}

class SetsStore {
  sets = $state<FlashCardSet[]>([]);
  loaded = $state(false);

  get bundled(): FlashCardSet[] {
    return this.sets.filter((s) => s.bundled);
  }

  get user(): FlashCardSet[] {
    return this.sets.filter((s) => !s.bundled);
  }

  byId(id: string): FlashCardSet | undefined {
    return this.sets.find((s) => s.id === id);
  }

  #readUserSets(): FlashCardSet[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return (JSON.parse(saved) as FlashCardSet[])
        .filter((s) => !s.bundled)
        .map((s, i) => ensureId(s, `user_${i}_${s.name}`));
    } catch (e) {
      console.warn('Failed to parse saved sets:', e);
      return [];
    }
  }

  async load(): Promise<void> {
    // Show the user's own sets immediately; bundled JSON streams in behind it.
    this.sets = this.#readUserSets();
    const bundled = await loadBundledSets();
    // Re-read user sets rather than reusing `user`: anything added while the
    // bundled JSON was in flight must survive.
    this.sets = [...bundled, ...this.sets.filter((s) => !s.bundled)];
    this.loaded = true;
    this.persist();
  }

  persist(): void {
    const userSets = this.sets.filter((s) => !s.bundled);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSets));
  }

  add(set: FlashCardSet): void {
    this.sets = [...this.sets, ensureId(set)];
    this.persist();
  }

  update(id: string, set: FlashCardSet): void {
    this.sets = this.sets.map((s) => (s.id === id ? { ...set, id, bundled: s.bundled, bundledFileName: s.bundledFileName } : s));
    this.persist();
  }

  remove(id: string): boolean {
    const set = this.byId(id);
    if (!set || set.bundled) return false;
    this.sets = this.sets.filter((s) => s.id !== id);
    this.persist();
    return true;
  }

  exportSet(id: string): void {
    const set = this.byId(id);
    if (!set) return;
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

  importFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string);
        const result = validateImportedSet(raw);
        if (!result.valid) {
          ui.showToast(result.error, 'error');
          return;
        }
        this.add(result.data);
        ui.showToast('Set imported successfully!', 'success');
      } catch (err) {
        console.warn('Import failed:', err);
        ui.showToast('Error importing file. Please ensure it is a valid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  copyBundled(id: string): FlashCardSet | null {
    const set = this.byId(id);
    if (!set?.bundled) return null;
    // structuredClone cannot clone the $state proxy; snapshot it to a plain object first.
    const copy: FlashCardSet = $state.snapshot(set) as FlashCardSet;
    delete copy.bundled;
    delete copy.bundledFileName;
    copy.id = uid('set');

    const names = new Set(this.sets.map((s) => s.name));
    let name = copy.name;
    let n = 0;
    while (names.has(name)) {
      n++;
      name = `${set.name} (${n})`;
    }
    copy.name = name;
    this.add(copy);
    ui.showToast(`Copied “${copy.name}”`, 'success');
    return copy;
  }
}

export const setsStore = new SetsStore();
