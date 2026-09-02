import type { ClientInit } from '@sveltejs/kit';
import { goto } from '$app/navigation';

export const init: ClientInit = async () => {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === 'creator') {
    await goto('/create', { replaceState: true });
  } else if (hash === 'study') {
    await goto('/study', { replaceState: true });
  } else if (hash === 'settings') {
    await goto('/settings', { replaceState: true });
  }
};
