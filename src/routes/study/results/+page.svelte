<script lang="ts">
  import { expandAnswerVariations } from '$lib/domain/answers';
  import { study } from '$lib/state/study.svelte';

  const total = $derived(study.results.correct + study.results.wrong);
  const accuracy = $derived(total > 0 ? Math.round((study.results.correct / total) * 100) : 0);
  const ranked = $derived([...study.players].sort((a, b) => b.score - a.score));
  const topScore = $derived(ranked[0]?.score ?? 0);
</script>

<div id="resultsView" class="view active page-enter" role="region" aria-label="Results">
  <div class="results-header"><h2>Study Results</h2></div>
  <div class="results-content">
    <div class="stat-card">
      <div class="stat-value" id="totalCards">{total}</div>
      <div class="stat-label">Total Cards</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="correctCards">{study.results.correct}</div>
      <div class="stat-label">Correct</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="wrongCards">{study.results.wrong}</div>
      <div class="stat-label">Wrong</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="accuracyPercent">{accuracy}%</div>
      <div class="stat-label">Accuracy</div>
    </div>
  </div>

  {#if study.moderator && ranked.length}
    <div id="moderatorResultsSection" class="moderator-results-section">
      <h3>Player Scores</h3>
      <div id="moderatorFinalScores" class="moderator-final-scores">
        {#each ranked as p, i}
          {@const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          <div class="mod-final-card" class:winner={p.score === topScore && p.score > 0}>
            <span class="mod-rank">{rank}</span>
            <span class="mod-final-name">{p.name}</span>
            <span class="mod-final-score">{p.score}</span>
            <span class="mod-final-label">points</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="cards-results-container">
    <h3>Card Results</h3>
    <div id="cardsResultsList" class="cards-results-list">
      {#each study.results.cards as cr, i}
        {@const expanded = expandAnswerVariations(cr.card.answer || '')}
        {@const primary = expanded[0] || cr.card.answer || ''}
        <div class="card-result-item {cr.result}">
          <div class="card-result-header">
            <span class="card-result-number">Card {i + 1}</span>
            <span class="card-result-badge {cr.result}">
              {cr.result === 'correct' ? '✓ Correct' : '✗ Wrong'}
            </span>
          </div>
          <div class="card-result-content">
            <div class="card-result-question"><strong>Question:</strong> {cr.question}</div>
            <div class="card-result-answer"><strong>Answer:</strong> {primary}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="results-actions">
    <a href="/study" id="studyAgainBtn" class="btn btn-primary">Study Again</a>
    <a href="/" id="backToMainFromResultsBtn" class="btn btn-secondary">Back to Main</a>
  </div>
</div>
