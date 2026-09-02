import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { isStandalone, isWiiU } from '$lib/domain/utils';
import { study } from '$lib/state/study.svelte';
import type { GamepadState } from '$lib/types';

export const gamepadState: GamepadState = {
  connected: false,
  gamepad: null,
  previousButtons: [],
  previousAxes: [],
  lastButtonPress: 0,
  buttonDebounceDelay: 200,
  navigationIndex: 0,
  navigationElements: [],
  wiiu: false,
  wiiuLastDpad: 0,
};

function currentView(): string {
  const path = get(page).url.pathname;
  if (path === '/') return 'main';
  if (path.startsWith('/create') || path.startsWith('/edit')) return 'editor';
  if (path === '/study') return 'setup';
  if (path.startsWith('/study/play')) return 'study';
  if (path.startsWith('/study/results')) return 'results';
  if (path.startsWith('/settings')) return 'settings';
  return 'main';
}

export function setupGamepadSupport(): () => void {
  const onConnect = (e: GamepadEvent) => {
    gamepadState.connected = true;
    gamepadState.gamepad = e.gamepad;
    gamepadState.previousButtons = new Array(e.gamepad.buttons.length).fill(false);
    gamepadState.previousAxes = new Array(e.gamepad.axes.length).fill(0);
    updateGamepadNavigation();
    startPolling();
  };
  const onDisconnect = () => {
    gamepadState.connected = false;
    gamepadState.gamepad = null;
    clearFocus();
  };

  window.addEventListener('gamepadconnected', onConnect);
  window.addEventListener('gamepaddisconnected', onDisconnect);

  if (navigator.getGamepads) {
    for (const gp of navigator.getGamepads()) {
      if (!gp) continue;
      gamepadState.connected = true;
      gamepadState.gamepad = gp;
      gamepadState.previousButtons = new Array(gp.buttons.length).fill(false);
      gamepadState.previousAxes = new Array(gp.axes.length).fill(0);
      updateGamepadNavigation();
      startPolling();
      break;
    }
  }

  if (isWiiU()) setupWiiUSupport();

  return () => {
    window.removeEventListener('gamepadconnected', onConnect);
    window.removeEventListener('gamepaddisconnected', onDisconnect);
    gamepadState.connected = false;
  };
}

function setupWiiUSupport(): void {
  gamepadState.wiiu = true;
  gamepadState.connected = true;
  document.documentElement.classList.add('wiiu');
  document.addEventListener(
    'keydown',
    (e) => {
      if (!gamepadState.wiiu) return;
      const kc = e.keyCode || e.which;
      if (kc === 13 || (kc >= 37 && kc <= 40)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (kc === 13) handleWiiUConfirm();
      else if (kc >= 37 && kc <= 40) {
        if (Date.now() - gamepadState.wiiuLastDpad < 200) return;
        gamepadState.wiiuLastDpad = Date.now();
        let vv = 0,
          hh = 0;
        if (kc === 38) vv = -1;
        if (kc === 40) vv = 1;
        if (kc === 37) hh = -1;
        if (kc === 39) hh = 1;
        navigateWithDpad(vv, hh);
      }
    },
    true,
  );
  if (window.wiiu?.gamepad) {
    let lastStick = 0;
    function poll() {
      if (!gamepadState.wiiu) return;
      try {
        window.wiiu!.gamepad!.update?.();
        const g = window.wiiu!.gamepad!;
        let hh = 0,
          vv = 0;
        if (g.leftStickX !== undefined) hh = Math.abs(g.leftStickX) > 0.3 ? g.leftStickX : 0;
        if (g.leftStickY !== undefined) vv = Math.abs(g.leftStickY) > 0.3 ? -g.leftStickY : 0;
        if (hh || vv) {
          const now = Date.now();
          if (now - lastStick > 180) {
            lastStick = now;
            navigateWithDpad(vv, hh);
          }
        }
      } catch {
        /* ignore */
      }
      requestAnimationFrame(poll);
    }
    requestAnimationFrame(poll);
  }
  updateGamepadNavigation();
}

export function updateGamepadNavigation(): void {
  gamepadState.navigationElements = [];
  gamepadState.navigationIndex = 0;
  clearFocus();

  const push = (id: string) => {
    const e = document.getElementById(id);
    if (e && (e.tagName !== 'BUTTON' || !(e as HTMLButtonElement).disabled)) {
      gamepadState.navigationElements.push(e);
    }
  };

  const view = currentView();
  switch (view) {
    case 'main':
      ['createSetBtn', 'studyBtn', 'importSetBtn', 'printBtn'].forEach(push);
      break;
    case 'setup':
      ['backToMainFromSetupBtn', 'selectedSet', 'selectedRound', 'progressiveMode', 'startStudyBtn'].forEach(push);
      break;
    case 'results':
      ['studyAgainBtn', 'backToMainFromResultsBtn'].forEach(push);
      break;
    case 'editor':
      ['saveSetBtn', 'backToMainBtn', 'newSetBtn'].forEach(push);
      break;
    case 'settings':
      push('themeSelectSettings');
      push('updateBtnSettings');
      break;
    case 'study':
      if (!isStandalone()) {
        push('readAloudBtn');
        push('readVoiceSelect');
      }
      if (study.flipped) {
        push('wrongBtn');
        push('rightBtn');
      } else {
        push('flipCardBtn');
        if (study.canHint) push('askForHintBtn');
      }
      break;
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
    if (fallback) (fallback as HTMLElement).click();
    return;
  }
  if (f.tagName === 'BUTTON' || f.tagName === 'A') {
    f.click();
    return;
  }
  if (f.tagName === 'INPUT') {
    const inp = f as HTMLInputElement;
    if (inp.type === 'checkbox') {
      inp.checked = !inp.checked;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      inp.focus();
    }
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
  let next = cur;
  if (v < -0.5 || h < -0.5) next = Math.max(0, cur - 1);
  else if (v > 0.5 || h > 0.5) next = Math.min(gamepadState.navigationElements.length - 1, cur + 1);
  if (next !== cur) setFocus(next);
}

function startPolling(): void {
  if (!gamepadState.connected) return;
  function poll() {
    if (!gamepadState.connected) return;
    const gp = navigator.getGamepads()[0];
    if (!gp) {
      gamepadState.connected = false;
      clearFocus();
      return;
    }
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
      handleButton(i);
      gamepadState.lastButtonPress = now;
    }
    gamepadState.previousButtons[i] = pressed;
  }
  handleDpad(gp);
}

function handleButton(btn: number): void {
  const view = currentView();
  if (view === 'study') handleStudyBtn(btn);
  else if (view === 'results') {
    if (btn === 0) document.getElementById('studyAgainBtn')?.click();
    if (btn === 1 || btn === 8) document.getElementById('backToMainFromResultsBtn')?.click();
  } else if (view === 'main' || view === 'setup' || view === 'settings') {
    if (btn === 0) activateFocused();
    if (view === 'setup' && (btn === 1 || btn === 8)) document.getElementById('backToMainFromSetupBtn')?.click();
  } else if (view === 'editor') {
    if (btn === 1 || btn === 8) document.getElementById('backToMainBtn')?.click();
    if (btn === 0) {
      const f = document.querySelector<HTMLElement>('.gamepad-focused');
      if (f?.id === 'saveSetBtn') f.click();
    }
  }
}

function handleStudyBtn(btn: number): void {
  const flipped = study.flipped;
  if (btn === 0) {
    const f = document.querySelector<HTMLElement>('.gamepad-focused');
    if (f) activateFocused();
    else if (flipped) study.mark(true);
    else study.flip();
  } else if (btn === 1) {
    if (flipped) study.mark(false);
  } else if (btn === 3) {
    if (study.canHint) study.hint();
  } else if (btn === 8) {
    void goto('/');
  }
}

function handleWiiUConfirm(): void {
  const now = Date.now();
  if (now - gamepadState.lastButtonPress < gamepadState.buttonDebounceDelay) return;
  gamepadState.lastButtonPress = now;
  const view = currentView();
  if (view === 'study') handleStudyBtn(0);
  else if (view === 'results') document.getElementById('studyAgainBtn')?.click();
  else activateFocused();
}

function handleDpad(gp: Gamepad): void {
  const dz = 0.5;
  let h = 0,
    v = 0;
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
