import { describe, it, expect } from 'bun:test';
import { expandAnswerVariations } from '../src/lib/domain/answers';

describe('expandAnswerVariations', () => {
  it('returns empty array for empty/whitespace input', () => {
    expect(expandAnswerVariations('')).toEqual([]);
    expect(expandAnswerVariations('   ')).toEqual([]);
    expect(expandAnswerVariations(null as unknown as string)).toEqual([]);
  });

  it('returns the text as-is when no syntax is used', () => {
    expect(expandAnswerVariations('Photosynthesis')).toEqual(['Photosynthesis']);
  });

  it('expands (option1/option2) interchangeable parts', () => {
    const result = expandAnswerVariations('Conservation of (mass/matter)');
    expect(result).toContain('Conservation of mass');
    expect(result).toContain('Conservation of matter');
    expect(result).toHaveLength(2);
  });

  it('expands [optional] brackets', () => {
    const result = expandAnswerVariations('[Law of] Conservation');
    expect(result).toContain('Conservation');
    expect(result).toContain('Law of Conservation');
    expect(result).toHaveLength(2);
  });

  it('expands nested (GAMETE[S]/SEX CELLS)', () => {
    const result = expandAnswerVariations('(GAMETE[S]/SEX CELLS)');
    expect(result).toContain('GAMETE');
    expect(result).toContain('GAMETES');
    expect(result).toContain('SEX CELLS');
  });

  it('handles GOLGI [(APPARATUS/BODY/COMPLEX)]', () => {
    const result = expandAnswerVariations('GOLGI [(APPARATUS/BODY/COMPLEX)]');
    expect(result).toContain('GOLGI');
    expect(result).toContain('GOLGI APPARATUS');
    expect(result).toContain('GOLGI BODY');
    expect(result).toContain('GOLGI COMPLEX');
  });

  it('handles multiple interchangeable groups', () => {
    const result = expandAnswerVariations('(A/B) and (C/D)');
    expect(result).toContain('A and C');
    expect(result).toContain('A and D');
    expect(result).toContain('B and C');
    expect(result).toContain('B and D');
    expect(result).toHaveLength(4);
  });

  it('deduplicates identical results', () => {
    const result = expandAnswerVariations('(X/X)');
    expect(result).toEqual(['X']);
  });

  it('handles combined optional + interchangeable', () => {
    const result = expandAnswerVariations('[Law of] Conservation of (mass/matter)');
    expect(result).toContain('Conservation of mass');
    expect(result).toContain('Conservation of matter');
    expect(result).toContain('Law of Conservation of mass');
    expect(result).toContain('Law of Conservation of matter');
  });
});
