import { sets } from './state';
import { el } from './utils';

export function populateSetOptions(selectId: string): void {
  const select = el<HTMLSelectElement>(selectId);
  select.innerHTML = '<option value="">Select a set...</option>';
  sets.forEach((set, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${set.name} (${set.cards.length} cards)`;
    select.appendChild(opt);
  });
}

export function populateRoundOptions(
  setSelectId: string,
  roundSelectId: string,
  groupId: string,
): void {
  const select = el<HTMLSelectElement>(setSelectId);
  const roundSelect = el<HTMLSelectElement>(roundSelectId);
  const group = el(groupId);

  if (select.value === '') {
    group.style.display = 'none';
    roundSelect.innerHTML = '<option value="">All Rounds</option>';
    return;
  }

  const set = sets[parseInt(select.value, 10)];
  if (set.rounds?.length) {
    group.style.display = 'block';
    roundSelect.innerHTML = '<option value="">All Rounds</option>';
    [...set.rounds].sort((a, b) => a.number - b.number).forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `Round ${r.number}`;
      roundSelect.appendChild(opt);
    });
  } else {
    group.style.display = 'none';
    roundSelect.innerHTML = '<option value="">All Rounds</option>';
  }
}
