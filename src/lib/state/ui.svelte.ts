import type { ThemeName } from '$lib/types';
import { THEME_META_COLORS } from '$lib/types';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

class UiStore {
  toasts = $state<ToastItem[]>([]);
  confirmOpen = $state(false);
  confirmMessage = $state('');
  printOpen = $state(false);
  theme = $state<ThemeName>('dark');
  standalone = $state(false);

  #toastSeq = 0;
  #confirmResolver: ((value: boolean) => void) | null = null;

  applyTheme(theme?: ThemeName): void {
    const resolved = (theme ||
      (typeof localStorage !== 'undefined' && (localStorage.getItem('appTheme') as ThemeName)) ||
      'dark') as ThemeName;
    this.theme = resolved;
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', resolved);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta && THEME_META_COLORS[resolved]) {
      meta.setAttribute('content', THEME_META_COLORS[resolved]);
    }
  }

  setTheme(theme: ThemeName): void {
    localStorage.setItem('appTheme', theme);
    this.applyTheme(theme);
  }

  showToast(message: string, type: ToastType = 'info', duration = 3500): void {
    const id = ++this.#toastSeq;
    this.toasts = [...this.toasts, { id, message, type }];
    if (duration > 0) {
      setTimeout(() => this.dismissToast(id), duration);
    }
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  showConfirm(message: string): Promise<boolean> {
    this.confirmMessage = message;
    this.confirmOpen = true;
    return new Promise((resolve) => {
      this.#confirmResolver = resolve;
    });
  }

  resolveConfirm(result: boolean): void {
    this.confirmOpen = false;
    this.#confirmResolver?.(result);
    this.#confirmResolver = null;
  }
}

export const ui = new UiStore();
