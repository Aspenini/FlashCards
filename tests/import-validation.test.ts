import { describe, it, expect } from 'bun:test';
import { validateImportedSet } from '../src/lib/domain/import-validation';

describe('validateImportedSet', () => {
  const validSet = {
    name: 'Test Set',
    cards: [{ questions: [{ text: 'What is 2+2?', order: 1 }], answer: '4' }],
  };

  it('accepts a valid minimal set', () => {
    const result = validateImportedSet(validSet);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Test Set');
      expect(result.data.cards).toHaveLength(1);
      expect(result.data.id).toBeTruthy();
    }
  });

  it('rejects null/undefined/non-object', () => {
    expect(validateImportedSet(null).valid).toBe(false);
    expect(validateImportedSet(undefined).valid).toBe(false);
    expect(validateImportedSet('string').valid).toBe(false);
    expect(validateImportedSet(42).valid).toBe(false);
  });

  it('rejects missing name', () => {
    const result = validateImportedSet({ cards: validSet.cards });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('name');
  });

  it('rejects empty name', () => {
    const result = validateImportedSet({ name: '   ', cards: validSet.cards });
    expect(result.valid).toBe(false);
  });

  it('rejects missing cards', () => {
    const result = validateImportedSet({ name: 'Test' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('cards');
  });

  it('rejects empty cards array', () => {
    const result = validateImportedSet({ name: 'Test', cards: [] });
    expect(result.valid).toBe(false);
  });

  it('rejects card without answer', () => {
    const result = validateImportedSet({
      name: 'Test',
      cards: [{ questions: [{ text: 'Q?', order: 1 }] }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('answer');
  });

  it('rejects card with no valid questions', () => {
    const result = validateImportedSet({
      name: 'Test',
      cards: [{ questions: [{ text: '', order: 1 }], answer: 'A' }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('questions');
  });

  it('handles legacy string questions', () => {
    const result = validateImportedSet({
      name: 'Test',
      cards: [{ questions: ['What is 2+2?'], answer: '4' }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.cards[0].questions[0].text).toBe('What is 2+2?');
    }
  });

  it('parses optional metadata', () => {
    const result = validateImportedSet({
      ...validSet,
      year: 2024,
      creator: 'Alice',
      subject: 'Math',
      color: '#ff0000',
      rounds: [{ id: 'r1', number: 1 }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.year).toBe(2024);
      expect(result.data.creator).toBe('Alice');
      expect(result.data.subject).toBe('Math');
      expect(result.data.color).toBe('#ff0000');
      expect(result.data.rounds).toHaveLength(1);
    }
  });

  it('ignores invalid color format', () => {
    const result = validateImportedSet({ ...validSet, color: 'red' });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.color).toBeUndefined();
    }
  });

  it('validates card-level optional fields', () => {
    const result = validateImportedSet({
      name: 'Test',
      cards: [
        {
          questions: [{ text: 'Q', order: 1 }],
          answer: 'A',
          hints: ['Hint'],
          doNotAccept: 'Bad answer',
          image: '<svg></svg>',
          roundId: 'r1',
        },
      ],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.cards[0].hints).toEqual(['Hint']);
      expect(result.data.cards[0].doNotAccept).toBe('Bad answer');
      expect(result.data.cards[0].image).toBe('<svg></svg>');
      expect(result.data.cards[0].roundId).toBe('r1');
    }
  });
});
