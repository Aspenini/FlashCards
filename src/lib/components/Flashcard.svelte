<script lang="ts">
  import { sanitizeImageHtml } from '$lib/domain/sanitize';
  import { study } from '$lib/state/study.svelte';

  const card = $derived(study.current);
  const imageHtml = $derived(card?.image?.trim() ? sanitizeImageHtml(card.image) : '');
  const hasImage = $derived(!!imageHtml);
  const hints = $derived(card?.hints?.length ? card.hints.join(' • ') : '');
  const dna = $derived(card?.doNotAccept ? `DO NOT ACCEPT: ${card.doNotAccept}` : '');
  const extras = $derived(study.expandedAnswers.slice(1));

  function onKey(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && !study.flipped) {
      e.preventDefault();
      study.flip();
    }
  }
</script>

<div class="card-container">
  <div
    id="flashcard"
    class="flashcard"
    class:flipped={study.flipped}
    class:slide-out={study.animating === 'out'}
    class:slide-in={study.animating === 'in'}
    role="button"
    tabindex="0"
    aria-label="Flashcard – click or press Enter to flip"
    onclick={() => {
      if (!study.flipped) study.flip();
    }}
    onkeydown={onKey}
  >
    <div class="card-front" class:has-image={hasImage}>
      <div id="hintsFront" class="card-hints">{hints}</div>
      <div class="card-main-content">
        <div class="card-text-content">
          <div class="card-label"><span>Question</span></div>
          <div id="questionText" class="card-content" aria-live="polite">{study.questionText}</div>
        </div>
        {#if hasImage}
          <div id="cardImageFront" class="card-image">{@html imageHtml}</div>
        {/if}
      </div>
    </div>
    <div class="card-back" class:has-image={hasImage}>
      <div id="doNotAcceptBack" class="card-do-not-accept">{dna}</div>
      <div class="card-main-content">
        <div class="card-text-content">
          <div class="card-label">Answer</div>
          <div id="answerText" class="card-content" aria-live="polite">{study.primaryAnswer}</div>
          {#if extras.length}
            <div id="acceptedAnswersList" class="accepted-answers-list">
              <div class="accepted-forms-label">Also accepted:</div>
              <div class="accepted-forms">
                {#each extras as a}
                  <div class="accepted-form-item">{a}</div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        {#if hasImage}
          <div id="cardImageBack" class="card-image">{@html imageHtml}</div>
        {/if}
      </div>
    </div>
  </div>
</div>
