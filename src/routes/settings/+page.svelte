<script lang="ts">
  import ThemeSelect from '$lib/components/ThemeSelect.svelte';
  import { APP_VERSION } from '$lib/types';

  function updateAndReload() {
    const path = window.location.pathname || '/';
    const hash = window.location.hash || '';
    window.location.href = `${path}?update=${Date.now()}${hash}`;
  }
</script>

<div id="settingsView" class="view active page-enter" role="region" aria-label="Settings">
  <div class="settings-header"><h2>Settings</h2></div>
  <div class="settings-content">
    <p class="settings-version" id="settingsVersion">{APP_VERSION}</p>
    <div class="theme-select-row settings-update-row">
      <label for="themeSelectSettings">Theme</label>
      <ThemeSelect id="themeSelectSettings" />
    </div>
    <div class="settings-update-row">
      <button type="button" id="updateBtnSettings" class="btn btn-secondary" onclick={updateAndReload}>Update</button>
      <span class="hint">Get latest app version; keeps your sets.</span>
    </div>
  </div>
</div>
