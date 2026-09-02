<script lang="ts">
  import { study } from '$lib/state/study.svelte';
  import { onMount } from 'svelte';

  let voices = $state<SpeechSynthesisVoice[]>([]);
  let selected = $state(0);

  function populate() {
    if (typeof speechSynthesis === 'undefined') return;
    voices = speechSynthesis.getVoices();
  }

  onMount(() => {
    populate();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = populate;
    }
    return () => {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = null;
    };
  });

  function read() {
    if (typeof speechSynthesis === 'undefined') return;
    const text = (study.flipped ? study.primaryAnswer : study.questionText).trim();
    if (!text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voices[selected]) u.voice = voices[selected];
    else u.lang = 'en-US';
    speechSynthesis.speak(u);
  }
</script>

<div class="study-read-controls">
  <button type="button" id="readAloudBtn" class="btn-read-aloud" title="Read current side aloud" aria-label="Read current side aloud" onclick={read}>
    <span class="material-symbols-outlined" aria-hidden="true">volume_up</span>
  </button>
  <label for="readVoiceSelect" class="sr-only">Voice</label>
  <select id="readVoiceSelect" class="read-voice-select" title="Choose voice" bind:value={selected}>
    {#each voices as voice, i}
      <option value={i}>{voice.name || voice.lang}</option>
    {/each}
  </select>
</div>
