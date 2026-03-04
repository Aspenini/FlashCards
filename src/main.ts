/**
 * FlashCards – application entry point.
 *
 * Wires all modules together and sets up event listeners.
 * Serves as the composition root: no module imports main.ts,
 * so there are zero circular dependencies.
 */

import './styles.css';

import { APP_VERSION, lastStudySetupState, setLastStudySetupState, gamepadState } from './state';
import { cleanReloadQueryFromUrl, isWiiU, el } from './utils';
import { applyTheme, setTheme } from './theme';
import { showView, handleHashChange, updatePwaNavActive, onViewChange } from './views';
import { loadBundledSets, loadSets } from './storage';
import { renderSets, setupSetListDelegation } from './render';
import {
  openCreateSet,
  saveSet,
  deleteSet,
  addCardToEditor,
  toggleRounds,
  addRound,
  setupCardListDelegation,
  setupRoundListDelegation,
} from './editor';
import {
  populateSetSelect,
  updateRoundSelect,
  startStudy,
  flipCard,
  markAnswer,
  askForHint,
} from './study';
import { openPrintModal, closePrintModal, updatePrintRoundSelect, generatePrintPdf } from './print';
import { handleImport } from './import-export';
import { setupQuestionDragAndDrop } from './drag-drop';
import { setupGamepadSupport, setupWiiUSupport, updateGamepadNavigation, injectGamepadDeps } from './gamepad';
import { setupReadAloud } from './read-aloud';

// ── Gamepad dependency injection (breaks circular import) ──────────────────
injectGamepadDeps({ showView, flipCard, markAnswer, askForHint });

// ── View-change hook (runs after every showView call) ──────────────────────
onViewChange((viewId, previousId) => {
  // Persist study-setup state when leaving that view
  if (previousId === 'studySetupView') {
    const setSelect = document.getElementById('selectedSet') as HTMLSelectElement | null;
    const roundSelect = document.getElementById('selectedRound') as HTMLSelectElement | null;
    const prog = document.getElementById('progressiveMode') as HTMLInputElement | null;
    if (setSelect && roundSelect && prog) {
      setLastStudySetupState({
        setIndex: setSelect.value,
        roundId: roundSelect.value,
        progressive: prog.checked,
      });
    }
  }

  // Restore study-setup state when returning to it
  if (viewId === 'studySetupView') {
    populateSetSelect();
    const setSelect = el<HTMLSelectElement>('selectedSet');
    const roundSelect = el<HTMLSelectElement>('selectedRound');
    const prog = el<HTMLInputElement>('progressiveMode');
    const state = lastStudySetupState;
    if (state.setIndex && Array.from(setSelect.options).some((o) => o.value === state.setIndex)) {
      setSelect.value = state.setIndex;
      updateRoundSelect();
    }
    if (state.roundId && Array.from(roundSelect.options).some((o) => o.value === state.roundId)) {
      roundSelect.value = state.roundId;
    }
    prog.checked = state.progressive;
  }

  // Gamepad navigation refresh
  if (gamepadState.connected) updateGamepadNavigation(viewId);
});

// ── Update + reload ────────────────────────────────────────────────────────
function updateAndReload(): void {
  const path = window.location.pathname || '/';
  const hash = window.location.hash || '';
  window.location.href = `${path}?update=${Date.now()}${hash}`;
}

// ── Site logo fallback ─────────────────────────────────────────────────────
function setupSiteLogoFallback(): void {
  const logo = document.getElementById('siteLogo') as HTMLImageElement | null;
  const fallback = document.getElementById('siteLogoFallback');
  if (!logo || !fallback) return;
  logo.onerror = () => { logo.classList.add('failed'); fallback.classList.add('visible'); };
  logo.onload = () => { logo.classList.remove('failed'); fallback.classList.remove('visible'); };
  if (logo.complete && !logo.naturalWidth) logo.onerror(new Event('error'));
}

// ── Event listeners ────────────────────────────────────────────────────────
function setupEventListeners(): void {
  setupQuestionDragAndDrop();
  setupSetListDelegation();
  setupCardListDelegation();
  setupRoundListDelegation();

  // Main view
  el('createSetBtn').addEventListener('click', openCreateSet);
  el('studyBtn').addEventListener('click', () => { showView('studySetupView'); populateSetSelect(); });
  el('importSetBtn').addEventListener('click', () => el<HTMLInputElement>('importFileInput').click());
  el('printBtn').addEventListener('click', openPrintModal);
  el<HTMLInputElement>('importFileInput').addEventListener('change', handleImport);

  // PWA bottom nav
  document.getElementById('pwaNavHome')?.addEventListener('click', () => showView('mainView'));
  document.getElementById('pwaNavStudy')?.addEventListener('click', () => showView('studySetupView'));
  document.getElementById('pwaNavCreate')?.addEventListener('click', () => showView('setEditorView'));
  document.getElementById('pwaNavSettings')?.addEventListener('click', () => showView('settingsView'));

  // Version sync
  const versionEl = document.querySelector('.version-info');
  const settingsV = document.getElementById('settingsVersion');
  if (versionEl) versionEl.textContent = APP_VERSION;
  if (settingsV) settingsV.textContent = APP_VERSION;

  // Update button (settings)
  document.getElementById('updateBtnSettings')?.addEventListener('click', updateAndReload);

  // Themes
  applyTheme();
  const mainTheme = document.getElementById('themeSelectMain') as HTMLSelectElement | null;
  const settingsTheme = document.getElementById('themeSelectSettings') as HTMLSelectElement | null;
  mainTheme?.addEventListener('change', () => setTheme(mainTheme.value));
  settingsTheme?.addEventListener('change', () => setTheme(settingsTheme.value));

  // Print modal
  el('printModalClose').addEventListener('click', closePrintModal);
  el('printModalBackdrop').addEventListener('click', closePrintModal);
  el('printModalCancel').addEventListener('click', closePrintModal);
  el<HTMLSelectElement>('printSetSelect').addEventListener('change', updatePrintRoundSelect);
  el('printGenerateBtn').addEventListener('click', generatePrintPdf);

  // Editor
  el('backToMainBtn').addEventListener('click', () => showView('mainView'));
  el('newSetBtn').addEventListener('click', openCreateSet);
  el('addCardBtn').addEventListener('click', () => addCardToEditor());
  el('saveSetBtn').addEventListener('click', saveSet);
  el('deleteSetBtn').addEventListener('click', deleteSet);
  el<HTMLInputElement>('roundsEnabled').addEventListener('change', toggleRounds);
  el('addRoundBtn').addEventListener('click', addRound);

  // Color picker + text sync
  const picker = el<HTMLInputElement>('setColor');
  const colorText = el<HTMLInputElement>('setColorText');
  picker.addEventListener('input', () => { colorText.value = picker.value; });
  colorText.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(colorText.value.trim())) picker.value = colorText.value.trim();
  });

  // Study setup
  el('backToMainFromSetupBtn').addEventListener('click', () => showView('mainView'));
  el<HTMLSelectElement>('selectedSet').addEventListener('change', updateRoundSelect);
  el('startStudyBtn').addEventListener('click', startStudy);

  // Study view
  el('flipCardBtn').addEventListener('click', flipCard);
  el('flashcard').addEventListener('click', () => {
    if (!el('flashcard').classList.contains('flipped')) flipCard();
  });
  el('wrongBtn').addEventListener('click', () => markAnswer(false));
  el('rightBtn').addEventListener('click', () => markAnswer(true));
  el('askForHintBtn').addEventListener('click', askForHint);
  setupReadAloud();

  // Results
  el('studyAgainBtn').addEventListener('click', () => showView('studySetupView'));
  el('backToMainFromResultsBtn').addEventListener('click', () => showView('mainView'));
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cleanReloadQueryFromUrl();
  loadBundledSets();
  loadSets();
  setupEventListeners();
  setupSiteLogoFallback();
  setupGamepadSupport();
  if (isWiiU()) setupWiiUSupport();
  renderSets();

  window.addEventListener('hashchange', handleHashChange);

  setTimeout(() => {
    if (window.location.hash) handleHashChange();
    else showView('mainView', false);
    updatePwaNavActive();
  }, 0);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
  }
});
