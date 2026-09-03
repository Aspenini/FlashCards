<script lang="ts">
  import SetCard from '$lib/components/SetCard.svelte';
  import ThemeSelect from '$lib/components/ThemeSelect.svelte';
  import { setsStore } from '$lib/state/sets.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { APP_VERSION } from '$lib/types';

  let query = $state('');
  let importInput: HTMLInputElement | undefined = $state();
  let logoFailed = $state(false);

  const q = $derived(query.trim().toLowerCase());
  const bundled = $derived(
    setsStore.sets.filter((s) => s.bundled && (!q || s.name.toLowerCase().includes(q) || (s.subject ?? '').toLowerCase().includes(q))),
  );
  const user = $derived(
    setsStore.sets.filter((s) => !s.bundled && (!q || s.name.toLowerCase().includes(q) || (s.subject ?? '').toLowerCase().includes(q))),
  );
</script>

<div id="mainView" class="view active page-enter" role="region" aria-label="Home">
  <div class="main-header">
    <div class="header-top">
      <div class="site-logo">
        <img
          id="siteLogo"
          src="/img/logo.png"
          alt="FlashCards"
          class:failed={logoFailed}
          onerror={() => (logoFailed = true)}
        />
        <h1 id="siteLogoFallback" class="site-logo-fallback" class:visible={logoFailed}>FlashCards</h1>
      </div>
      <div class="theme-select-row theme-select-row-main">
        <label for="themeSelectMain">Theme</label>
        <ThemeSelect id="themeSelectMain" />
      </div>
    </div>
    <div class="button-group">
      <a href="/create" id="createSetBtn" class="btn btn-primary">Create New Set</a>
      <a href="/study" id="studyBtn" class="btn btn-primary" class:disabled={setsStore.sets.length === 0} aria-disabled={setsStore.sets.length === 0}>Study</a>
      <button id="importSetBtn" class="btn btn-secondary" type="button" onclick={() => importInput?.click()}>Import Set</button>
      <button id="printBtn" class="btn btn-secondary" type="button" onclick={() => (ui.printOpen = true)}>Print</button>
    </div>
  </div>
  <input
    type="file"
    id="importFileInput"
    accept=".json"
    hidden
    bind:this={importInput}
    onchange={(e) => {
      const file = (e.currentTarget as HTMLInputElement).files?.[0];
      if (file) setsStore.importFile(file);
      (e.currentTarget as HTMLInputElement).value = '';
    }}
  />

  {#if setsStore.sets.length > 4}
    <div class="search-row">
      <input type="search" placeholder="Search sets…" bind:value={query} aria-label="Search sets" />
    </div>
  {/if}

  <div class="sets-container">
    {#if bundled.length}
      <div id="bundledSetsContainer">
        <h2>Bundled Sets <span class="count">{bundled.length}</span></h2>
        <div id="bundledSetsList" class="sets-list">
          {#each bundled as set (set.id)}
            <SetCard {set} />
          {/each}
        </div>
      </div>
    {/if}
    <h2>Your Sets {#if user.length}<span class="count">{user.length}</span>{/if}</h2>
    <div id="setsList" class="sets-list">
      {#if user.length === 0}
        <p class="empty-message">
          {#if !setsStore.loaded}
            Loading sets…
          {:else if q}
            No matching sets.
          {:else}
            No sets yet. Create your first set to get started!
          {/if}
        </p>
      {:else}
        {#each user as set (set.id)}
          <SetCard {set} />
        {/each}
      {/if}
    </div>
  </div>

  <div class="version-info">{APP_VERSION}</div>
</div>

<style>
  a.btn.disabled {
    pointer-events: none;
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
</style>
