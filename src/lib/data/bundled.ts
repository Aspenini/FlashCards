import type { FlashCardSet } from '../types';

const modules = import.meta.glob('../../../bundled/*.json', { eager: true }) as Record<
  string,
  { default: Omit<FlashCardSet, 'id' | 'bundled'> }
>;

export function loadBundledSets(): FlashCardSet[] {
  return Object.entries(modules)
    .filter(([path]) => !path.endsWith('index.json'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, mod]) => {
      const data = mod.default;
      const fileName = path.split(/[/\\]/).pop() ?? 'unknown.json';
      return {
        ...data,
        id: `bundled:${fileName}`,
        bundled: true,
        bundledFileName: fileName,
      } satisfies FlashCardSet;
    });
}
