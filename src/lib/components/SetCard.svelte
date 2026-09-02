<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatYearDisplay } from '$lib/domain/utils';
  import { setsStore } from '$lib/state/sets.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import type { FlashCardSet } from '$lib/types';

  interface Props {
    set: FlashCardSet;
  }
  let { set }: Props = $props();

  const meta = $derived.by(() => {
    const parts: string[] = [];
    parts.push(`${set.cards.length} card${set.cards.length !== 1 ? 's' : ''}`);
    if (set.rounds?.length) parts.push(`${set.rounds.length} round${set.rounds.length !== 1 ? 's' : ''}`);
    const yr = formatYearDisplay(set.year);
    if (yr) parts.push(yr);
    if (set.creator) parts.push(set.creator);
    if (set.subject) parts.push(set.subject);
    return parts.join(' • ');
  });

  const colorValid = $derived(!!set.color && /^#[0-9A-Fa-f]{6}$/.test(String(set.color)));

  async function remove() {
    if (await ui.showConfirm('Are you sure you want to delete this set?')) {
      setsStore.remove(set.id);
      ui.showToast('Set deleted', 'success');
    }
  }
</script>

<div class="set-item" class:bundled-set={set.bundled}>
  {#if set.color}
    <div
      class="set-item-color"
      style={colorValid ? `background:${set.color}` : ''}
      aria-hidden="true"
    ></div>
  {/if}
  <button
    type="button"
    class="set-info"
    onclick={() => {
      if (!set.bundled) goto(`/edit/${set.id}`);
    }}
    style={set.bundled ? 'cursor:default;text-align:left;background:none;border:none;padding:0;color:inherit;font:inherit;' : 'text-align:left;background:none;border:none;padding:0;color:inherit;font:inherit;cursor:pointer;'}
  >
    <div class="set-name">{set.name}</div>
    <div class="set-meta">{meta}</div>
  </button>
  <div class="set-actions">
    {#if set.bundled}
      <button class="btn btn-secondary btn-icon" type="button" onclick={() => setsStore.copyBundled(set.id)}>Copy</button>
    {:else}
      <button class="btn btn-secondary btn-icon" type="button" onclick={() => goto(`/edit/${set.id}`)}>Edit</button>
    {/if}
    <button class="btn btn-secondary btn-icon" type="button" onclick={() => setsStore.exportSet(set.id)}>Export</button>
    {#if !set.bundled}
      <button class="btn btn-danger btn-icon" type="button" onclick={remove}>Delete</button>
    {/if}
  </div>
</div>
