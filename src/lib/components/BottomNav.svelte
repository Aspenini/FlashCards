<script lang="ts">
  import { page } from '$app/state';

  const path = $derived(page.url.pathname);

  function isActive(href: string): boolean {
    if (href === '/') return path === '/';
    return path === href || path.startsWith(href + '/');
  }
</script>

<nav class="pwa-bottom-nav" id="pwaBottomNav" aria-label="Main navigation">
  <a href="/" class="pwa-nav-btn" class:active={isActive('/')} aria-current={isActive('/') ? 'page' : undefined} aria-label="Home" id="pwaNavHome">
    <span class="material-symbols-outlined pwa-nav-icon" aria-hidden="true">home</span>
    <span class="pwa-nav-label">Home</span>
  </a>
  <a href="/study" class="pwa-nav-btn" class:active={path.startsWith('/study')} aria-current={path.startsWith('/study') ? 'page' : undefined} aria-label="Study" id="pwaNavStudy">
    <span class="material-symbols-outlined pwa-nav-icon" aria-hidden="true">menu_book</span>
    <span class="pwa-nav-label">Study</span>
  </a>
  <a href="/create" class="pwa-nav-btn" class:active={path.startsWith('/create') || path.startsWith('/edit')} aria-current={path.startsWith('/create') || path.startsWith('/edit') ? 'page' : undefined} aria-label="Create set" id="pwaNavCreate">
    <span class="material-symbols-outlined pwa-nav-icon" aria-hidden="true">add_circle</span>
    <span class="pwa-nav-label">Create</span>
  </a>
  <a href="/settings" class="pwa-nav-btn" class:active={isActive('/settings')} aria-current={isActive('/settings') ? 'page' : undefined} aria-label="Settings" id="pwaNavSettings">
    <span class="material-symbols-outlined pwa-nav-icon" aria-hidden="true">settings</span>
    <span class="pwa-nav-label">Settings</span>
  </a>
</nav>
