<script lang="ts">
  import { goto } from '$app/navigation';
  import Flashcard from '$lib/components/Flashcard.svelte';
  import ModeratorPanel from '$lib/components/ModeratorPanel.svelte';
  import ProgressTimeline from '$lib/components/ProgressTimeline.svelte';
  import ReadAloud from '$lib/components/ReadAloud.svelte';
  import ReviewOverlay from '$lib/components/ReviewOverlay.svelte';
  import { study } from '$lib/state/study.svelte';

  $effect(() => {
    if (study.cards.length === 0) {
      goto('/study');
      return;
    }
    if (study.done) {
      goto('/study/results');
    }
  });
</script>

<div id="studyView" class="view active page-enter" role="region" aria-label="Study">
  <div class="study-header">
    <div class="progress-info">
      <span id="progressText">
        Card {Math.min(study.index + 1, study.cards.length)} of {study.cards.length}
      </span>
      <ProgressTimeline />
    </div>
    <ReviewOverlay />
  </div>

  {#if study.moderator}
    <ModeratorPanel />
  {:else}
    <Flashcard />
    <div class="study-actions">
      {#if !study.flipped}
        <button id="flipCardBtn" class="btn btn-secondary" type="button" onclick={() => study.flip()}>Flip Card</button>
        {#if study.canHint}
          <div id="hintButton" class="hint-button">
            <button id="askForHintBtn" class="btn btn-secondary" type="button" onclick={() => study.hint()}>Add Next Question</button>
          </div>
        {/if}
      {:else}
        <div id="answerButtons" class="answer-buttons">
          <button id="wrongBtn" class="btn btn-danger" type="button" onclick={() => study.mark(false)}>✗ Wrong</button>
          <button id="rightBtn" class="btn btn-success" type="button" onclick={() => study.mark(true)}>✓ Right</button>
        </div>
      {/if}
    </div>
    <ReadAloud />
  {/if}
</div>
