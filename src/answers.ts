/**
 * Answer variation expansion.
 *
 * Syntax:
 *   (option1/option2)  – interchangeable words
 *   [optional]          – optional prefix/suffix
 *
 * Examples:
 *   (GAMETE[S]/SEX CELLS)                   → GAMETE, GAMETES, SEX CELLS
 *   GOLGI [(APPARATUS/BODY/COMPLEX)]        → GOLGI, GOLGI APPARATUS, GOLGI BODY, GOLGI COMPLEX
 */

function expandSquareBrackets(text: string): string[] {
  const bracketPattern = /\[([^\]]*)\]/;
  const match = text.match(bracketPattern);
  if (!match) return [text];

  const bracketContent = match[1];
  const before = text.substring(0, match.index!);
  const after = text.substring(match.index! + match[0].length);

  const without = (before + after).trim();
  const withIt = (before + bracketContent + after).trim();

  const results: string[] = [...expandSquareBrackets(without)];
  if (withIt && withIt !== without) {
    results.push(...expandSquareBrackets(withIt));
  }
  return [...new Set(results)];
}

function expandInterchangeableParts(text: string): string[] {
  const pattern = /\(([^)]+)\)/;
  const match = text.match(pattern);
  if (!match) return expandSquareBrackets(text);

  const options = match[1]
    .split('/')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (options.length === 0) return [text];

  const before = text.substring(0, match.index!);
  const after = text.substring(match.index! + match[0].length);
  const results: string[] = [];

  for (const option of options) {
    for (const optVar of expandSquareBrackets(option)) {
      results.push(...expandInterchangeableParts(before + optVar + after));
    }
  }
  return [...new Set(results)];
}

export function expandAnswerVariations(answerText: string): string[] {
  if (!answerText?.trim()) return [];

  // Collect outermost [X] not inside parentheses
  const bracketMatches: { start: number; end: number; content: string }[] = [];

  for (let i = answerText.length - 1; i >= 0; i--) {
    if (answerText[i] !== ']') continue;

    let depth = 0;
    let start = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (answerText[j] === ')') depth++;
      else if (answerText[j] === '(') {
        depth--;
        if (depth < 0) break;
      } else if (answerText[j] === '[' && depth === 0) {
        start = j;
        break;
      }
    }
    if (start === -1) continue;

    const beforeStart = answerText.substring(0, start);
    const openP = (beforeStart.match(/\(/g) || []).length;
    const closeP = (beforeStart.match(/\)/g) || []).length;
    if (openP === closeP) {
      bracketMatches.push({
        start,
        end: i + 1,
        content: answerText.substring(start + 1, i),
      });
    }
  }

  if (bracketMatches.length > 0) {
    bracketMatches.sort((a, b) => b.start - a.start);

    let variations = [answerText];
    for (const m of bracketMatches) {
      const next: string[] = [];
      for (const v of variations) {
        const without = (v.substring(0, m.start) + v.substring(m.end)).replace(/\s+/g, ' ').trim();
        const withIt = (v.substring(0, m.start) + m.content + v.substring(m.end))
          .replace(/\s+/g, ' ')
          .trim();
        if (without) next.push(without);
        if (withIt) next.push(withIt);
      }
      variations = [...new Set(next)];
    }

    const final: string[] = [];
    for (const v of variations) {
      final.push(...expandInterchangeableParts(v));
    }
    return [...new Set(final.filter((v) => v?.trim()))];
  }

  return expandInterchangeableParts(answerText);
}
