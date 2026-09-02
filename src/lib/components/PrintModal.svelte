<script lang="ts">
  import { generatePrintPdf } from '$lib/domain/print';
  import { setsStore } from '$lib/state/sets.svelte';
  import { ui } from '$lib/state/ui.svelte';

  let setId = $state('');
  let roundId = $state('');
  let generating = $state(false);

  const selected = $derived(setsStore.byId(setId));
  const rounds = $derived(selected?.rounds?.length ? [...selected.rounds].sort((a, b) => a.number - b.number) : []);

  $effect(() => {
    if (ui.printOpen) {
      setId = setsStore.sets[0]?.id ?? '';
      roundId = '';
    }
  });

  function close() {
    ui.printOpen = false;
  }

  async function generate() {
    if (!selected) {
      ui.showToast('Please select a set', 'warning');
      return;
    }
    generating = true;
    try {
      await generatePrintPdf(selected, roundId);
      close();
    } catch (e) {
      ui.showToast(e instanceof Error ? e.message : 'Failed to generate PDF', 'error');
    } finally {
      generating = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if ui.printOpen}
  <div id="printModal" class="modal" role="dialog" aria-modal="true" aria-label="Print flashcards" tabindex="-1" onkeydown={onKey}>
    <div class="modal-backdrop" role="presentation" onclick={close}></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Print Flashcards</h2>
        <button type="button" class="modal-close" aria-label="Close" onclick={close}>&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="printSetSelect">Set</label>
          <select id="printSetSelect" class="select-input" bind:value={setId}>
            <option value="">Select a set...</option>
            {#each setsStore.sets as set}
              <option value={set.id}>{set.name} ({set.cards.length} cards)</option>
            {/each}
          </select>
        </div>
        {#if rounds.length}
          <div class="form-group">
            <label for="printRoundSelect">Round</label>
            <select id="printRoundSelect" class="select-input" bind:value={roundId}>
              <option value="">All Rounds</option>
              {#each rounds as r}
                <option value={r.id}>Round {r.number}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick={close}>Cancel</button>
        <button type="button" class="btn btn-primary" id="printGenerateBtn" disabled={generating} onclick={generate}>
          {generating ? 'Generating…' : 'Generate PDF'}
        </button>
      </div>
    </div>
  </div>
{/if}
