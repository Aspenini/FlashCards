<script lang="ts">
  import { ui } from '$lib/state/ui.svelte';

  function onKey(e: KeyboardEvent) {
    if (ui.confirmOpen && e.key === 'Escape') ui.resolveConfirm(false);
  }
</script>

<svelte:window onkeydown={onKey} />

{#if ui.confirmOpen}
  <div
    class="confirm-overlay confirm-visible"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) ui.resolveConfirm(false);
    }}
  >
    <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Confirmation">
      <p class="confirm-message">{ui.confirmMessage}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary confirm-cancel" type="button" onclick={() => ui.resolveConfirm(false)}>
          Cancel
        </button>
        <button class="btn btn-danger confirm-ok" type="button" onclick={() => ui.resolveConfirm(true)}>
          Confirm
        </button>
      </div>
    </div>
  </div>
{/if}
