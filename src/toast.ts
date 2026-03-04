let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'toastContainer';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('role', 'status');
  document.body.appendChild(container);
  return container;
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  duration = 3500,
): void {
  const c = getContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${escapeForToast(message)}</span>`;

  toast.addEventListener('click', () => dismiss(toast));

  c.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  if (duration > 0) {
    setTimeout(() => dismiss(toast), duration);
  }
}

function dismiss(toast: HTMLElement): void {
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-exit');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  setTimeout(() => toast.remove(), 400);
}

function escapeForToast(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Confirmation');

    dialog.innerHTML = `
      <p class="confirm-message">${escapeForToast(message)}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary confirm-cancel">Cancel</button>
        <button class="btn btn-danger confirm-ok">Confirm</button>
      </div>`;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('confirm-visible'));

    const okBtn = dialog.querySelector<HTMLButtonElement>('.confirm-ok')!;
    const cancelBtn = dialog.querySelector<HTMLButtonElement>('.confirm-cancel')!;
    okBtn.focus();

    function close(result: boolean) {
      overlay.classList.remove('confirm-visible');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      setTimeout(() => overlay.remove(), 400);
      resolve(result);
    }

    okBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(false);
    });
  });
}
