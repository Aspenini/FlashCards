<script lang="ts">
  import { page } from '$app/state';
  import SetEditor from '$lib/components/SetEditor.svelte';
  import { setsStore } from '$lib/state/sets.svelte';
  import { ui } from '$lib/state/ui.svelte';

  const id = $derived(page.params.id ?? '');
  const existing = $derived(setsStore.byId(id));
</script>

<div id="setEditorView" class="view active page-enter" role="region" aria-label="Set editor">
  {#if !setsStore.loaded}
    <p class="empty-message">Loading…</p>
  {:else if !existing}
    <div class="editor-header">
      <a href="/" class="btn btn-secondary">← Back</a>
      <h2>Set not found</h2>
    </div>
    <p class="empty-message">That set doesn’t exist or was deleted.</p>
  {:else if existing.bundled}
    <div class="editor-header">
      <a href="/" class="btn btn-secondary">← Back</a>
      <h2>Bundled set</h2>
    </div>
    <p class="empty-message">Bundled sets cannot be edited. Copy it first to make your own version.</p>
    <button
      class="btn btn-primary"
      type="button"
      onclick={() => {
        const copy = setsStore.copyBundled(existing.id);
        if (!copy) ui.showToast('Could not copy set', 'error');
      }}
    >
      Copy to My Sets
    </button>
  {:else}
    <SetEditor {existing} />
  {/if}
</div>
