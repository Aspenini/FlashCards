import { rounds, setRounds } from './state';
import { el } from './utils';
import { showToast } from './toast';

export function toggleRounds(): void {
  const enabled = (el('roundsEnabled') as HTMLInputElement).checked;
  if (enabled) {
    el('roundsSection').style.display = 'block';
    renderRounds();
    updateAllCardRoundDropdowns();
  } else {
    let hasAssigned = false;
    document.querySelectorAll<HTMLSelectElement>('.card-round-select').forEach((sel) => {
      if (sel.value) hasAssigned = true;
    });
    if (hasAssigned) {
      showToast('Cannot disable rounds. Remove round assignments from all cards first.', 'warning');
      (el('roundsEnabled') as HTMLInputElement).checked = true;
      return;
    }
    el('roundsSection').style.display = 'none';
  }
}

export function addRound(): void {
  const existing = rounds.map((r) => r.number);
  let suggested = 1;
  while (existing.includes(suggested)) suggested++;

  const input = prompt('Enter round number:', String(suggested));
  if (input === null) return;

  const num = parseInt(input, 10);
  if (isNaN(num) || num < 1) {
    showToast('Please enter a valid positive number', 'warning');
    return;
  }
  if (existing.includes(num)) {
    showToast(`Round ${num} already exists.`, 'warning');
    return;
  }

  setRounds([...rounds, { id: 'round_' + Date.now(), number: num }].sort((a, b) => a.number - b.number));
  renderRounds();
  updateAllCardRoundDropdowns();
}

export function removeRound(roundId: string): void {
  if (rounds.length <= 1) {
    showToast('You must have at least one round', 'warning');
    return;
  }
  setRounds(rounds.filter((r) => r.id !== roundId));
  document.querySelectorAll<HTMLSelectElement>('.card-round-select').forEach((sel) => {
    if (sel.value === roundId) sel.value = '';
  });
  renderRounds();
  updateAllCardRoundDropdowns();
}

export function editRoundNumber(roundId: string): void {
  const round = rounds.find((r) => r.id === roundId);
  if (!round) return;
  const others = rounds.filter((r) => r.id !== roundId).map((r) => r.number);
  const input = prompt(`Enter new number for Round ${round.number}:`, String(round.number));
  if (input === null) return;
  const num = parseInt(input, 10);
  if (isNaN(num) || num < 1) {
    showToast('Please enter a valid positive number', 'warning');
    return;
  }
  if (others.includes(num)) {
    showToast(`Round ${num} already exists.`, 'warning');
    return;
  }
  setRounds(rounds.map((r) => r.id === roundId ? { ...r, number: num } : r).sort((a, b) => a.number - b.number));
  renderRounds();
  updateAllCardRoundDropdowns();
}

export function renderRounds(): void {
  const list = el('roundsList');
  list.innerHTML = '';
  rounds.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'round-item';
    item.innerHTML = `
      <span>Round ${r.number}</span>
      <button class="btn btn-secondary btn-tiny" data-round-action="edit" data-round-id="${r.id}">Edit</button>
      <button class="btn btn-danger btn-tiny" data-round-action="remove" data-round-id="${r.id}">×</button>`;
    list.appendChild(item);
  });
}

export function setupRoundListDelegation(): void {
  el('roundsList').addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-round-action]');
    if (!target) return;
    const id = target.dataset.roundId!;
    if (target.dataset.roundAction === 'edit') editRoundNumber(id);
    else if (target.dataset.roundAction === 'remove') removeRound(id);
  });
}

export function updateAllCardRoundDropdowns(): void {
  const enabled = (el('roundsEnabled') as HTMLInputElement).checked;

  document.querySelectorAll<HTMLSelectElement>('.card-round-select').forEach((sel) => {
    const current = sel.value;
    const opts = rounds.map(
      (r) => `<option value="${r.id}" ${current === r.id ? 'selected' : ''}>Round ${r.number}</option>`,
    );
    sel.innerHTML = '<option value="">No Round</option>' + opts.join('');
  });

  if (enabled && rounds.length > 0) {
    document.querySelectorAll('.card-item').forEach((ci) => {
      if (!ci.querySelector('.card-round-select-wrapper')) {
        const inputs = ci.querySelector('.card-item-inputs')!;
        const opts = rounds.map((r) => `<option value="${r.id}">Round ${r.number}</option>`).join('');
        inputs.insertAdjacentHTML(
          'afterbegin',
          `<div class="card-round-select-wrapper"><label>Round:</label>
           <select class="card-round-select"><option value="">No Round</option>${opts}</select></div>`,
        );
      }
    });
  } else if (!enabled) {
    document.querySelectorAll('.card-round-select-wrapper').forEach((el) => el.remove());
  }
}
