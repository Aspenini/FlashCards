/**
 * Gamepad + Wii U browser support.
 *
 * Dependencies are injected via setters to avoid circular imports with views/study.
 */

import { gamepadState } from './state';
import { isStandalone } from './utils';
import { getCurrentViewId } from './views';

// ── Injected callbacks (set by main.ts) ────────────────────────────────────

let _showView: (id: string) => void = () => {};
let _flipCard: () => void = () => {};
let _markAnswer: (correct: boolean) => void = () => {};
let _askForHint: () => void = () => {};

export function injectGamepadDeps(deps: {
  showView: (id: string) => void;
  flipCard: () => void;
  markAnswer: (correct: boolean) => void;
  askForHint: () => void;
}): void {
  _showView = deps.showView;
  _flipCard = deps.flipCard;
  _markAnswer = deps.markAnswer;
  _askForHint = deps.askForHint;
}

// ── Setup ──────────────────────────────────────────────────────────────────

export function setupGamepadSupport(): void {
  window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    gamepadState.connected = true;
    gamepadState.gamepad = e.gamepad;
    gamepadState.previousButtons = new Array(e.gamepad.buttons.length).fill(false);
    gamepadState.previousAxes = new Array(e.gamepad.axes.length).fill(0);
    updateGamepadNavigation(getCurrentViewId());
    startPolling();
  });

  window.addEventListener('gamepaddisconnected', () => {
    gamepadState.connected = false;
    gamepadState.gamepad = null;
    clearFocus();
  });

  if (navigator.getGamepads) {
    for (const gp of navigator.getGamepads()) {
      if (!gp) continue;
      gamepadState.connected = true;
      gamepadState.gamepad = gp;
      gamepadState.previousButtons = new Array(gp.buttons.length).fill(false);
      gamepadState.previousAxes = new Array(gp.axes.length).fill(0);
      updateGamepadNavigation(getCurrentViewId());
      startPolling();
      break;
    }
  }
}

export function setupWiiUSupport(): void {
  gamepadState.wiiu = true;
  gamepadState.connected = true;
  document.documentElement.classList.add('wiiu');
  setupWiiUKeyEvents();
  if (window.wiiu?.gamepad) setupWiiUGamepadPolling();
  updateGamepadNavigation(getCurrentViewId());
}

// ── Navigation ─────────────────────────────────────────────────────────────

export function updateGamepadNavigation(viewId: string): void {
  gamepadState.navigationElements = [];
  gamepadState.navigationIndex = 0;
  clearFocus();

  const push = (id: string) => {
    const e = document.getElementById(id);
    if (e && (e.tagName !== 'BUTTON' || !(e as HTMLButtonElement).disabled)) {
      gamepadState.navigationElements.push(e);
    }
  };

  switch (viewId) {
    case 'mainView':
      ['createSetBtn', 'studyBtn', 'importSetBtn', 'printBtn'].forEach(push);
      break;
    case 'studySetupView':
      ['backToMainFromSetupBtn', 'selectedSet', 'selectedRound', 'progressiveMode', 'startStudyBtn'].forEach(push);
      break;
    case 'resultsView':
      ['studyAgainBtn', 'backToMainFromResultsBtn'].forEach(push);
      break;
    case 'setEditorView':
      ['saveSetBtn', 'backToMainBtn', 'newSetBtn'].forEach(push);
      break;
    case 'settingsView': {
      push('themeSelectSettings');
      push('updateBtnSettings');
      break;
    }
    case 'studyView': {
      if (!isStandalone()) { push('readAloudBtn'); push('readVoiceSelect'); }
      const flashcard = document.getElementById('flashcard');
      const flipped = flashcard?.classList.contains('flipped');
      if (flipped) { push('wrongBtn'); push('rightBtn'); }
      else {
        push('flipCardBtn');
        const hb = document.getElementById('hintButton');
        if (hb && hb.style.display !== 'none' && hb.offsetParent) push('askForHintBtn');
      }
      break;
    }
  }

  if (gamepadState.navigationElements.length > 0) setFocus(0);
}

function clearFocus(): void {
  document.querySelectorAll('.gamepad-focused').forEach((el) => el.classList.remove('gamepad-focused'));
}

function setFocus(idx: number): void {
  if (idx < 0 || idx >= gamepadState.navigationElements.length) return;
  clearFocus();
  gamepadState.navigationIndex = idx;
  const el = gamepadState.navigationElements[idx];
  el.classList.add('gamepad-focused');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function activateFocused(): void {
  const f = document.querySelector<HTMLElement>('.gamepad-focused');
  if (!f) {
    const fallback = gamepadState.navigationElements[gamepadState.navigationIndex];
    if (fallback) fallback.tagName === 'BUTTON' ? fallback.click() : fallback.focus();
    return;
  }

  if (f.tagName === 'BUTTON') { f.click(); return; }
  if (f.tagName === 'INPUT') {
    const inp = f as HTMLInputElement;
    if (inp.type === 'checkbox') { inp.checked = !inp.checked; inp.dispatchEvent(new Event('change', { bubbles: true })); }
    else { inp.focus(); if (inp.type !== 'number') inp.select(); }
    return;
  }
  if (f.tagName === 'SELECT') {
    const sel = f as HTMLSelectElement;
    if (sel.options.length) {
      sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }
  f.click();
}

function navigateWithDpad(v: number, h: number): void {
  if (gamepadState.navigationElements.length === 0) return;
  const cur = gamepadState.navigationIndex;
  const el = gamepadState.navigationElements[cur];
  const hasH = Math.abs(h) > 0.1;

  if (!hasH && el?.tagName === 'INPUT' && (el as HTMLInputElement).type === 'number') {
    const inp = el as HTMLInputElement;
    const step = parseFloat(inp.step) || 1;
    if (v < -0.5) { inp.value = String(Math.min(parseFloat(inp.max) || Infinity, (parseFloat(inp.value) || 0) + step)); inp.dispatchEvent(new Event('input', { bubbles: true })); return; }
    if (v > 0.5) { inp.value = String(Math.max(parseFloat(inp.min) || -Infinity, (parseFloat(inp.value) || 0) - step)); inp.dispatchEvent(new Event('input', { bubbles: true })); return; }
  }

  let next = cur;
  if (v < -0.5 || h < -0.5) next = Math.max(0, cur - 1);
  else if (v > 0.5 || h > 0.5) next = Math.min(gamepadState.navigationElements.length - 1, cur + 1);
  if (next !== cur) setFocus(next);
}

// ── Polling ────────────────────────────────────────────────────────────────

function startPolling(): void {
  if (!gamepadState.connected) return;
  function poll() {
    if (!gamepadState.connected) return;
    const gp = navigator.getGamepads()[0];
    if (!gp) { gamepadState.connected = false; clearFocus(); return; }
    gamepadState.gamepad = gp;
    handleInput(gp);
    requestAnimationFrame(poll);
  }
  poll();
}

function handleInput(gp: Gamepad): void {
  const now = Date.now();
  for (let i = 0; i < gp.buttons.length; i++) {
    const pressed = gp.buttons[i].pressed || gp.buttons[i].value > 0.5;
    const was = gamepadState.previousButtons[i] || false;
    if (pressed && !was && now - gamepadState.lastButtonPress > gamepadState.buttonDebounceDelay) {
      handleButton(i, getCurrentViewId());
      gamepadState.lastButtonPress = now;
    }
    gamepadState.previousButtons[i] = pressed;
  }
  handleDpad(gp);
}

function handleButton(btn: number, view: string): void {
  if (view === 'studyView') handleStudyBtn(btn);
  else if (view === 'resultsView') handleResultsBtn(btn);
  else if (view === 'mainView' || view === 'studySetupView' || view === 'settingsView') { if (btn === 0) activateFocused(); if ((view === 'studySetupView') && (btn === 1 || btn === 8)) document.getElementById('backToMainFromSetupBtn')?.click(); }
  else if (view === 'setEditorView') { if (btn === 1 || btn === 8) document.getElementById('backToMainBtn')?.click(); if (btn === 0) { const f = document.querySelector<HTMLElement>('.gamepad-focused'); if (f?.id === 'saveSetBtn') f.click(); } }
}

function handleStudyBtn(btn: number): void {
  const flipped = document.getElementById('flashcard')?.classList.contains('flipped');
  if (btn === 0) { const f = document.querySelector<HTMLElement>('.gamepad-focused'); f ? activateFocused() : (flipped ? _markAnswer(true) : _flipCard()); }
  else if (btn === 1) { if (flipped) _markAnswer(false); }
  else if (btn === 3) { const hb = document.getElementById('hintButton'); if (hb && hb.style.display !== 'none') _askForHint(); }
  else if (btn === 8) _showView('mainView');
}

function handleResultsBtn(btn: number): void {
  if (btn === 0) document.getElementById('studyAgainBtn')?.click();
  if (btn === 1 || btn === 8) document.getElementById('backToMainFromResultsBtn')?.click();
}

function handleDpad(gp: Gamepad): void {
  const dz = 0.5;
  let h = 0, v = 0;
  if (gp.axes.length >= 2) {
    h = Math.abs(gp.axes[0]) > dz ? gp.axes[0] : 0;
    v = Math.abs(gp.axes[1]) > dz ? gp.axes[1] : 0;
  }
  if (Math.abs(h) < 0.1 && Math.abs(v) < 0.1 && gp.buttons.length >= 16) {
    if (gp.buttons[12]?.pressed) v = -1;
    if (gp.buttons[13]?.pressed) v = 1;
    if (gp.buttons[14]?.pressed) h = -1;
    if (gp.buttons[15]?.pressed) h = 1;
  }
  if (Math.abs(h) > 0.1 || Math.abs(v) > 0.1) {
    const now = Date.now();
    if (now - gamepadState.lastButtonPress > 300) {
      navigateWithDpad(v, h);
      gamepadState.lastButtonPress = now;
    }
  }
}

// ── Wii U ──────────────────────────────────────────────────────────────────

function setupWiiUKeyEvents(): void {
  document.addEventListener('keydown', (e) => {
    if (!gamepadState.wiiu) return;
    const kc = e.keyCode || e.which;
    if (kc === 13 || (kc >= 37 && kc <= 40)) { e.preventDefault(); e.stopPropagation(); }
    if (kc === 13) handleWiiUConfirm();
    else if (kc >= 37 && kc <= 40) {
      if (Date.now() - gamepadState.wiiuLastDpad < 200) return;
      gamepadState.wiiuLastDpad = Date.now();
      let vv = 0, hh = 0;
      if (kc === 38) vv = -1; if (kc === 40) vv = 1;
      if (kc === 37) hh = -1; if (kc === 39) hh = 1;
      navigateWithDpad(vv, hh);
    }
  }, true);
}

function handleWiiUConfirm(): void {
  const now = Date.now();
  if (now - gamepadState.lastButtonPress < gamepadState.buttonDebounceDelay) return;
  gamepadState.lastButtonPress = now;
  const view = getCurrentViewId();
  if (view === 'studyView') handleStudyBtn(0);
  else if (view === 'resultsView') handleResultsBtn(0);
  else activateFocused();
}

function setupWiiUGamepadPolling(): void {
  if (!window.wiiu?.gamepad) return;
  let lastStick = 0;
  function poll() {
    if (!gamepadState.wiiu) return;
    try {
      window.wiiu!.gamepad!.update?.();
      const g = window.wiiu!.gamepad!;
      let hh = 0, vv = 0;
      if (g.leftStickX !== undefined) hh = Math.abs(g.leftStickX) > 0.3 ? g.leftStickX : 0;
      if (g.leftStickY !== undefined) vv = Math.abs(g.leftStickY) > 0.3 ? -g.leftStickY : 0;
      if (hh || vv) { const now = Date.now(); if (now - lastStick > 180) { lastStick = now; navigateWithDpad(vv, hh); } }
    } catch { /* ignore */ }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
}
