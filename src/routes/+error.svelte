<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="view active page-enter" role="region" aria-label="Error">
  <div class="editor-header">
    <a href="/" class="btn btn-secondary">← Home</a>
    <h2>{page.status === 404 ? 'Not found' : 'Something went wrong'}</h2>
  </div>
  <p class="empty-message">
    {page.error?.message ?? 'That page does not exist.'}
  </p>
</div>
