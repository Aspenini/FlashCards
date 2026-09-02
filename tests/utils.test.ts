import { describe, it, expect } from 'bun:test';
import { escapeHtml, parseYearInput, formatYearDisplay, stripHtmlForPdf } from '../src/lib/domain/utils';

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('passes through safe text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('parseYearInput', () => {
  it('returns null for empty string', () => {
    expect(parseYearInput('')).toBeNull();
    expect(parseYearInput('   ')).toBeNull();
  });

  it('parses a valid single year', () => {
    expect(parseYearInput('2024')).toBe(2024);
  });

  it('rejects years outside 1900-2100', () => {
    expect(parseYearInput('1800')).toBeNull();
    expect(parseYearInput('2200')).toBeNull();
  });

  it('parses a valid year range', () => {
    expect(parseYearInput('2024-2025')).toBe('2024-2025');
  });

  it('rejects invalid range where start > end', () => {
    expect(parseYearInput('2025-2024')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(parseYearInput('abc')).toBeNull();
  });

  it('handles whitespace in range', () => {
    expect(parseYearInput('2024 - 2025')).toBe('2024-2025');
  });
});

describe('formatYearDisplay', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatYearDisplay(null)).toBe('');
    expect(formatYearDisplay(undefined)).toBe('');
    expect(formatYearDisplay('')).toBe('');
  });

  it('formats a number year', () => {
    expect(formatYearDisplay(2024)).toBe('2024');
  });

  it('formats a string year range', () => {
    expect(formatYearDisplay('2024-2025')).toBe('2024-2025');
  });
});

describe('stripHtmlForPdf', () => {
  it('strips HTML tags', () => {
    expect(stripHtmlForPdf('<b>Bold</b> text')).toBe('Bold text');
  });

  it('returns empty string for non-string input', () => {
    expect(stripHtmlForPdf(null as unknown as string)).toBe('');
    expect(stripHtmlForPdf(123 as unknown as string)).toBe('');
  });

  it('trims whitespace', () => {
    expect(stripHtmlForPdf('  hello  ')).toBe('hello');
  });
});
