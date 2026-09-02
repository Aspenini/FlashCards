export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatYearDisplay(year: number | string | null | undefined): string {
  if (year == null || year === '') return '';
  if (typeof year === 'number' && !Number.isNaN(year)) return String(year);
  return String(year).trim();
}

/**
 * Validate year input: single year (1900-2100) or range "YYYY-YYYY".
 * Returns the value to store, or null if invalid.
 */
export function parseYearInput(val: string): number | string | null {
  const trimmed = String(val).trim();
  if (!trimmed) return null;

  const rangeMatch = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) {
    const y1 = parseInt(rangeMatch[1], 10);
    const y2 = parseInt(rangeMatch[2], 10);
    if (y1 >= 1900 && y1 <= 2100 && y2 >= 1900 && y2 <= 2100 && y1 <= y2) {
      return `${y1}-${y2}`;
    }
    return null;
  }

  const num = parseInt(trimmed, 10);
  if (!Number.isNaN(num) && num >= 1900 && num <= 2100) return num;
  return null;
}

export function isStandalone(): boolean {
  return (
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(display-mode: standalone)').matches) ||
    !!(navigator as { standalone?: boolean }).standalone
  );
}

export function isWiiU(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.userAgent.includes('Nintendo WiiU')) return true;
  if (typeof window !== 'undefined' && window.wiiu) return true;
  return false;
}

export function cleanReloadQueryFromUrl(): void {
  const q = window.location.search;
  if (q && (q.includes('nocache=') || q.includes('update='))) {
    try {
      history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
    } catch {
      // ignore
    }
  }
}

export function stripHtmlForPdf(html: string): string {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function tryGamepadVibration(options: {
  duration?: number;
  weak?: number;
  strong?: number;
}): void {
  try {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp?.vibrationActuator) continue;
      const duration = options.duration ?? 100;
      const weak = options.weak ?? 0.5;
      const strong = options.strong ?? 0.5;
      const actuator = gp.vibrationActuator as GamepadHapticActuator & {
        playEffect?: (type: string, params: object) => Promise<string>;
      };
      if (typeof actuator.playEffect === 'function') {
        actuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: weak,
          strongMagnitude: strong,
        });
      }
      break;
    }
  } catch {
    // ignore
  }
}

export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
