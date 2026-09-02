<script lang="ts">
  import { THEMES, type ThemeName } from '$lib/types';
  import { ui } from '$lib/state/ui.svelte';

  interface Props {
    id: string;
  }
  let { id }: Props = $props();

  const labels: Record<ThemeName, string> = {
    dark: 'Dark',
    light: 'Light',
    ocean: 'Ocean',
    forest: 'Forest',
    sunset: 'Sunset',
  };
</script>

<select
  {id}
  class="theme-select"
  title="Choose theme"
  aria-label="Choose theme"
  bind:value={ui.theme}
  onchange={() => ui.setTheme(ui.theme)}
>
  {#each THEMES as theme}
    <option value={theme}>{labels[theme]}</option>
  {/each}
</select>
