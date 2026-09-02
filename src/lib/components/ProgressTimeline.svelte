<script lang="ts">
  import { study } from '$lib/state/study.svelte';

  const total = $derived(study.cards.length);
  const compact = $derived(total > 15);
  const ultra = $derived(total > 30);
</script>

<div
  class="progress-timeline"
  class:compact
  class:ultra-compact={ultra}
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={study.progress}
  aria-label="Study progress"
  id="progressTimeline"
>
  {#each study.cards as _, i}
    {@const result = study.results.cards[i]}
    {@const completed = !!result}
    {@const current = i === study.index && !completed}
    <div class="progress-dot-wrapper" class:completed class:current>
      <button
        type="button"
        class="progress-dot"
        class:current
        class:completed
        class:wrong={result?.result === 'wrong'}
        data-index={i}
        aria-label="Card {i + 1}"
        disabled={!completed}
        onclick={() => completed && study.openReview(i)}
      ></button>
    </div>
  {/each}
</div>
