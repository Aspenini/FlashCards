import { describe, it, expect } from 'bun:test';
import { sanitizeImageHtml } from '../src/lib/domain/sanitize';

describe('sanitizeImageHtml', () => {
  it('returns empty string for empty/whitespace input', () => {
    expect(sanitizeImageHtml('')).toBe('');
    expect(sanitizeImageHtml('   ')).toBe('');
  });

  it('passes through safe SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>';
    const result = sanitizeImageHtml(svg);
    expect(result).toContain('<svg');
    expect(result).toContain('<circle');
  });

  it('strips script tags from SVG', () => {
    const malicious = '<svg><script>alert("xss")</script><circle cx="50" cy="50" r="40"/></svg>';
    const result = sanitizeImageHtml(malicious);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('strips event handlers from SVG', () => {
    const malicious = '<svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>';
    const result = sanitizeImageHtml(malicious);
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert');
  });

  it('creates a safe img tag for data URIs', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    const result = sanitizeImageHtml(dataUri);
    expect(result).toContain('<img');
    expect(result).toContain('src="data:image/png;base64,');
    expect(result).toContain('class="card-image-content"');
  });

  it('rejects arbitrary HTML', () => {
    expect(sanitizeImageHtml('<div>hello</div>')).toBe('');
    expect(sanitizeImageHtml('<img src=x onerror=alert(1)>')).toBe('');
    expect(sanitizeImageHtml('some random text')).toBe('');
  });
});
