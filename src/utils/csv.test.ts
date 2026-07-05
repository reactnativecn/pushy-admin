import { describe, expect, it } from 'bun:test';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins fields with commas and rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        [1, 2],
      ]),
    ).toBe('a,b\r\n1,2');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(toCsv([['a,b', 'say "hi"', 'line1\nline2']])).toBe(
      '"a,b","say ""hi""","line1\nline2"',
    );
  });

  it('serializes null/undefined as empty and keeps plain text unquoted', () => {
    expect(toCsv([[null, undefined, '中文', 42]])).toBe(',,中文,42');
  });
});
