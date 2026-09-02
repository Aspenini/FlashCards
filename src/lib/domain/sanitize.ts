import DOMPurify from 'dompurify';

const SVG_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: ['use'],
  FORBID_TAGS: ['script', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

export function sanitizeImageHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('<svg')) {
    const clean = DOMPurify.sanitize(trimmed, SVG_CONFIG);
    if (clean && !clean.trim().toLowerCase().startsWith('<svg')) {
      return `<svg xmlns="http://www.w3.org/2000/svg">${clean}</svg>`;
    }
    return clean;
  }

  if (trimmed.startsWith('data:image/')) {
    const img = document.createElement('img');
    img.src = trimmed;
    img.alt = 'Card image';
    img.className = 'card-image-content';
    return img.outerHTML;
  }

  return '';
}
