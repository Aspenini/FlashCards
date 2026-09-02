<script lang="ts">
  import { expandAnswerVariations } from '$lib/domain/answers';
  import { study } from '$lib/state/study.svelte';

  const review = $derived(study.reviewIndex !== null ? study.results.cards[study.reviewIndex] : null);
  const answer = $derived(review ? expandAnswerVariations(review.card.answer || '')[0] || review.card.answer : '');
</script>

{#if review && study.reviewIndex !== null}
  <div id="reviewOverlay" class="review-overlay" style="display:flex;" role="presentation" onclick={(e) => e.target === e.currentTarget && study.closeReview()}>
    <div class="review-card">
      <div class="review-header">
        <span id="reviewTitle" class="review-title">Card {study.reviewIndex + 1}</span>
        <button type="button" id="reviewClose" class="review-close" aria-label="Close review" onclick={() => study.closeReview()}>&times;</button>
      </div>
      <div class="review-body">
        <div class="review-section">
          <span class="review-label">Question</span>
          <span id="reviewQuestion" class="review-text">{review.question}</span>
        </div>
        <div class="review-section">
          <span class="review-label">Answer</span>
          <span id="reviewAnswer" class="review-text">{answer}</span>
        </div>
        <div id="reviewBadge" class="review-badge {review.result}">
          {review.result === 'correct' ? '✓ Correct' : '✗ Wrong'}
        </div>
      </div>
    </div>
  </div>
{/if}
