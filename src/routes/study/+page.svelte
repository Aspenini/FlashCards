<script lang="ts">
  import { goto } from '$app/navigation';
  import { setsStore } from '$lib/state/sets.svelte';
  import { study } from '$lib/state/study.svelte';
  import { ui } from '$lib/state/ui.svelte';

  let setId = $state(study.lastSetup.setId);
  let roundId = $state(study.lastSetup.roundId);
  let progressive = $state(study.lastSetup.progressive);
  let moderator = $state(study.lastSetup.moderator);

  const selected = $derived(setsStore.byId(setId));
  const rounds = $derived(selected?.rounds?.length ? [...selected.rounds].sort((a, b) => a.number - b.number) : []);

  $effect(() => {
    if (setId && !setsStore.byId(setId) && setsStore.loaded) {
      setId = setsStore.sets[0]?.id ?? '';
    } else if (!setId && setsStore.sets.length) {
      setId = study.lastSetup.setId && setsStore.byId(study.lastSetup.setId)
        ? study.lastSetup.setId
        : setsStore.sets[0].id;
    }
  });

  function start() {
    const err = study.start({ setId, roundId, progressive, moderator });
    if (err) {
      ui.showToast(err, 'warning');
      return;
    }
    goto('/study/play');
  }
</script>

<div id="studySetupView" class="view active page-enter" role="region" aria-label="Study setup">
  <div class="setup-header">
    <a href="/" id="backToMainFromSetupBtn" class="btn btn-secondary">← Back</a>
    <h2>Study Setup</h2>
  </div>
  <div class="setup-content">
    <div class="form-group">
      <label for="selectedSet">Select Set</label>
      <select id="selectedSet" class="select-input" bind:value={setId} onchange={() => (roundId = '')}>
        <option value="">Select a set...</option>
        {#each setsStore.sets as set}
          <option value={set.id}>{set.name} ({set.cards.length} cards)</option>
        {/each}
      </select>
    </div>
    {#if rounds.length}
      <div class="form-group" id="roundSelectGroup">
        <label for="selectedRound">Select Round</label>
        <select id="selectedRound" class="select-input" bind:value={roundId}>
          <option value="">All Rounds</option>
          {#each rounds as r}
            <option value={r.id}>Round {r.number}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="progressiveMode" bind:checked={progressive} />
        <span>Progressive Mode (questions shown in order, can add more before answering)</span>
      </label>
    </div>
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="moderatorMode" bind:checked={moderator} />
        <span>Moderator Mode (show question &amp; answer together, manage players &amp; points)</span>
      </label>
    </div>
    <button id="startStudyBtn" class="btn btn-primary" type="button" onclick={start}>Start Studying</button>
  </div>
</div>
