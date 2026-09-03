<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import PrintModal from '$lib/components/PrintModal.svelte';
  import ToastHost from '$lib/components/ToastHost.svelte';
  import { cleanReloadQueryFromUrl, isStandalone } from '$lib/domain/utils';
  import { setupGamepadSupport, updateGamepadNavigation } from '$lib/gamepad';
  import { setsStore } from '$lib/state/sets.svelte';
  import { ui } from '$lib/state/ui.svelte';

  let { children } = $props();

  onMount(() => {
    cleanReloadQueryFromUrl();
    ui.standalone = isStandalone();
    ui.applyTheme();
    setsStore.load().catch(() => {});
    const stop = setupGamepadSupport();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
    }

    return stop;
  });

  afterNavigate(() => {
    if (typeof document !== 'undefined') updateGamepadNavigation();
  });
</script>

<img id="pdfLogo" src="/img/logo.png" alt="" hidden />

<div class="container">
  {@render children()}
</div>

<BottomNav />
<PrintModal />
<ToastHost />
<ConfirmDialog />

<svelte:head>
  <link rel="icon" href="/img/sandy-bowling-approved.ico" />
</svelte:head>
