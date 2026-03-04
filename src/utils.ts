export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function formatYearDisplay(year: number | string | null | undefined): string {
  if (year == null || year === '') return '';
  if (typeof year === 'number' && !isNaN(year)) return String(year);
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
  if (!isNaN(num) && num >= 1900 && num <= 2100) return num;
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
  if (navigator.userAgent.includes('Nintendo WiiU')) return true;
  if (typeof window !== 'undefined' && window.wiiu) return true;
  return false;
}

export function cleanReloadQueryFromUrl(): void {
  const q = window.location.search;
  if (q && (q.includes('nocache=') || q.includes('update='))) {
    try {
      history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
    } catch (_) {
      // ignore
    }
  }
}

export function stripHtmlForPdf(html: string): string {
  if (typeof html !== 'string') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

/** Vibrate via Gamepad API vibrationActuator when available. */
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

/** el shorthand that throws a descriptive error when element is missing */
export function el<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} not found`);
  return element as T;
}

/** Like el(), but returns null instead of throwing when element is missing */
export function elMaybe<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
