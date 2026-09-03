import type { FlashCardSet } from '../types';

/**
 * Bundled sets are ~830 KB of JSON. Loading them lazily keeps them out of the
 * initial bundle, so the app is interactive before they arrive and each set is
 * cached as its own chunk.
 */
const modules = import.meta.glob('../../../bundled/*.json') as Record<
  string,
  () => Promise<{ default: Omit<FlashCardSet, 'id' | 'bundled'> }>
>;

function toSet(path: string, data: Omit<FlashCardSet, 'id' | 'bundled'>): FlashCardSet {
  const fileName = path.split(/[/\\]/).pop() ?? 'unknown.json';
  return {
    ...data,
    id: `bundled:${fileName}`,
    bundled: true,
    bundledFileName: fileName,
  } satisfies FlashCardSet;
}

export async function loadBundledSets(): Promise<FlashCardSet[]> {
  const entries = Object.entries(modules)
    .filter(([path]) => !path.endsWith('index.json'))
    .sort(([a], [b]) => a.localeCompare(b));

  const loaded = await Promise.all(
    entries.map(async ([path, load]) => {
      try {
        return toSet(path, (await load()).default);
      } catch {
        return null;
      }
    }),
  );

  return loaded.filter((s): s is FlashCardSet => s !== null);
}
