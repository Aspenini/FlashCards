export function setupReadAloud(): void {
  const btn = document.getElementById('readAloudBtn');
  const select = document.getElementById('readVoiceSelect') as HTMLSelectElement | null;
  if (!btn || !select) return;

  function populateVoices(): void {
    const voices = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
    const selected = select!.value;
    select!.innerHTML = '';
    voices.forEach((voice, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = voice.name || `${voice.lang}`;
      select!.appendChild(opt);
    });
    if (selected && voices[Number(selected)]) select!.value = selected;
    else if (voices.length > 0) select!.selectedIndex = 0;
  }

  if (typeof speechSynthesis !== 'undefined') {
    populateVoices();
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  btn.addEventListener('click', readAloudCurrentSide);
}

function readAloudCurrentSide(): void {
  if (typeof speechSynthesis === 'undefined') return;
  const flashcard = document.getElementById('flashcard');
  const questionEl = document.getElementById('questionText');
  const answerEl = document.getElementById('answerText');
  const select = document.getElementById('readVoiceSelect') as HTMLSelectElement | null;
  if (!flashcard || !questionEl || !answerEl) return;

  const isFlipped = flashcard.classList.contains('flipped');
  const text = (isFlipped ? answerEl : questionEl).textContent?.trim();
  if (!text) return;

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const idx = select?.value !== '' ? parseInt(select!.value, 10) : 0;
  if (voices[idx]) u.voice = voices[idx];
  else u.lang = 'en-US';
  speechSynthesis.speak(u);
}
