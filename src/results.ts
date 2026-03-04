import { studyResults, progressiveMode } from './state';
import { escapeHtml, el } from './utils';
import { expandAnswerVariations } from './answers';
import { showView } from './views';

export function showResults(): void {
  const total = studyResults.correct + studyResults.wrong;
  const accuracy = total > 0 ? Math.round((studyResults.correct / total) * 100) : 0;

  el('totalCards').textContent = String(total);
  el('correctCards').textContent = String(studyResults.correct);
  el('wrongCards').textContent = String(studyResults.wrong);
  el('accuracyPercent').textContent = `${accuracy}%`;

  // Points display (elements may not exist in HTML – guard against it)
  const pointsCard = document.getElementById('pointsCard');
  const pointsValue = document.getElementById('pointsValue');
  if (pointsCard && pointsValue && progressiveMode) {
    pointsValue.textContent = String(studyResults.points);
    pointsCard.style.display = 'block';
  } else if (pointsCard) {
    pointsCard.style.display = 'none';
  }

  const list = el('cardsResultsList');
  list.innerHTML = '';

  studyResults.cards.forEach((cr, i) => {
    const expanded = expandAnswerVariations(cr.card.answer || '');
    const primary = expanded.length > 0 ? expanded[0] : cr.card.answer || '';
    const icon = cr.result === 'correct' ? '✓' : '✗';

    const item = document.createElement('div');
    item.className = `card-result-item ${cr.result}`;
    item.innerHTML = `
      <div class="card-result-header">
        <span class="card-result-number">Card ${i + 1}</span>
        <span class="card-result-badge ${cr.result}">${icon} ${cr.result === 'correct' ? 'Correct' : 'Wrong'}</span>
      </div>
      <div class="card-result-content">
        <div class="card-result-question"><strong>Question:</strong> ${escapeHtml(cr.question)}</div>
        <div class="card-result-answer"><strong>Answer:</strong> ${escapeHtml(primary)}</div>
      </div>`;
    list.appendChild(item);
  });

  showView('resultsView');
}
