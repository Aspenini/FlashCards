<script lang="ts">
  import { ui } from '$lib/state/ui.svelte';

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
</script>

<div id="toastContainer" aria-live="polite" role="status">
  {#each ui.toasts as toast (toast.id)}
    <button type="button" class="toast toast-visible toast-{toast.type}" onclick={() => ui.dismissToast(toast.id)}>
      <span class="toast-icon">{icons[toast.type]}</span>
      <span class="toast-message">{toast.message}</span>
    </button>
  {/each}
</div>
