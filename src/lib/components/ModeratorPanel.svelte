<script lang="ts">
  import { sanitizeImageHtml } from '$lib/domain/sanitize';
  import { study } from '$lib/state/study.svelte';
  import { ui } from '$lib/state/ui.svelte';

  const card = $derived(study.current);
  const extras = $derived(study.expandedAnswers.slice(1));
  const imageHtml = $derived(card?.image?.trim() ? sanitizeImageHtml(card.image) : '');
  let scoredIdx = $state<number | null>(null);
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let swipeX = $state(0);
  let swipeOpacity = $state(1);

  function addPlayer() {
    const err = study.addPlayer(study.newPlayerName);
    if (err && study.newPlayerName.trim()) ui.showToast(err, 'warning');
  }

  function award(i: number) {
    study.award(i);
    scoredIdx = i;
    setTimeout(() => {
      if (scoredIdx === i) scoredIdx = null;
    }, 400);
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && dx < -10) {
      e.preventDefault();
      const clamped = Math.max(dx, -200);
      swipeX = clamped;
      swipeOpacity = Math.max(1 + clamped / 300, 0.3);
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    swipeX = 0;
    swipeOpacity = 1;
    if (dx < -80) study.moderatorNext();
  }
</script>

<div id="moderatorView" class="moderator-view">
  <div
    class="mod-qa-section"
    role="region"
    aria-label="Question and answer"
    class:mod-slide-out={study.animating === 'out'}
    class:mod-slide-in={study.animating === 'in'}
    style="transform: {swipeX ? `translateX(${swipeX}px)` : ''}; opacity: {swipeOpacity};"
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
  >
    <div class="mod-qa-block">
      <div class="mod-qa-label">Question</div>
      <div class="mod-qa-text" id="modQuestionText">{study.questionText}</div>
      {#if card?.hints?.length}
        <div class="mod-qa-hints" id="modHints">Hints: {card.hints.join(' • ')}</div>
      {/if}
    </div>
    <div class="mod-qa-block mod-answer-block">
      <div class="mod-qa-label">Answer</div>
      <div class="mod-qa-text" id="modAnswerText">{study.primaryAnswer}</div>
      {#if card?.doNotAccept}
        <div class="mod-qa-dna" id="modDoNotAccept">DO NOT ACCEPT: {card.doNotAccept}</div>
      {/if}
      {#if extras.length}
        <div class="mod-qa-accepted" id="modAccepted">Also accepted: {extras.join(', ')}</div>
      {/if}
    </div>
    {#if imageHtml}
      <div class="mod-qa-image" id="modImage">{@html imageHtml}</div>
    {/if}
  </div>
  <div class="mod-nav-row">
    {#if study.canHint}
      <button type="button" id="modHintBtn" class="btn btn-secondary" onclick={() => study.hint()}>Add Next Question</button>
    {/if}
    <button type="button" id="modNextBtn" class="btn btn-primary" onclick={() => study.moderatorNext()}>Next →</button>
  </div>
  <div class="mod-players-section">
    <div class="mod-players-header">
      <h3>Players</h3>
      <div class="mod-player-add-row">
        <input
          type="text"
          id="modPlayerNameInput"
          class="text-input"
          placeholder="Add player..."
          maxlength="40"
          bind:value={study.newPlayerName}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPlayer();
            }
          }}
        />
        <button type="button" id="modAddPlayerBtn" class="btn btn-primary btn-sm" onclick={addPlayer}>Add</button>
      </div>
    </div>
    <div id="modPlayersList" class="mod-players-list">
      {#each study.players as p, i}
        <div class="mod-player-row" class:just-scored={scoredIdx === i} data-pidx={i}>
          <span class="mod-player-name">{p.name}</span>
          <span class="mod-player-score-badge">{p.score}</span>
          <div class="mod-player-actions">
            <button type="button" class="mod-award-btn" data-pidx={i} title="Award point" onclick={() => award(i)}>+1</button>
            <button type="button" class="mod-remove-player-btn" data-pidx={i} aria-label="Remove {p.name}" onclick={() => study.removePlayer(i)}>&times;</button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
