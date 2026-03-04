/** Question drag-and-drop reordering within the card editor. */

export function setupQuestionDragAndDrop(): void {
  let dragged: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;

  document.addEventListener('dragstart', (e) => {
    const handle = e.target as HTMLElement;
    if (!handle.classList.contains('question-drag-handle')) return;
    dragged = handle.closest('.question-item');
    if (!dragged) return;
    e.dataTransfer!.effectAllowed = 'move';
    dragged.classList.add('dragging');
    dragged.style.opacity = '0.5';

    placeholder = document.createElement('div');
    placeholder.className = 'question-item question-placeholder';
    placeholder.innerHTML =
      '<div class="question-drag-handle" draggable="true">⋮⋮</div><div class="question-input-wrapper"><div class="placeholder-text">Drop here</div></div>';
  });

  document.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('dragging');
    dragged.style.opacity = '';
    dragged = null;
    placeholder?.remove();
    placeholder = null;
  });

  document.addEventListener('dragover', (e) => {
    if (!dragged) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    const target = (e.target as HTMLElement).closest('.question-item') as HTMLElement | null;
    if (!target || target === dragged || target === placeholder) return;

    const rect = target.getBoundingClientRect();
    placeholder?.remove();
    if (e.clientY < rect.top + rect.height / 2) {
      target.parentNode!.insertBefore(placeholder!, target);
    } else {
      target.parentNode!.insertBefore(placeholder!, target.nextSibling);
    }
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragged || !placeholder?.parentNode) return;
    placeholder.parentNode.replaceChild(dragged, placeholder);
    updateIndices(dragged.closest('.questions-list')!);
    placeholder = null;
    dragged = null;
  });
}

function updateIndices(list: Element): void {
  list.querySelectorAll('.question-item:not(.question-placeholder)').forEach((item, i) => {
    (item as HTMLElement).dataset.questionIndex = String(i);
    const ta = item.querySelector<HTMLTextAreaElement>('.card-question');
    if (ta) {
      ta.dataset.questionOrder = String(i + 1);
      ta.placeholder = `Question ${i + 1}`;
    }
  });
}
