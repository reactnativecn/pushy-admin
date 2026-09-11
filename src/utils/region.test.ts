import { describe, expect, it } from 'bun:test';
import { formatRegion, isRegionCode } from './region';

describe('formatRegion', () => {
  it('translates country codes into the viewer language', () => {
    expect(formatRegion('ID', 'zh-CN')).toBe('印度尼西亚');
    expect(formatRegion('ID', 'en')).toBe('Indonesia');
    expect(formatRegion('JP', 'zh-CN')).toBe('日本');
    expect(formatRegion(' US ', 'en')).toBe('United States');
  });

  it('passes province names and legacy Chinese country names through', () => {
    expect(formatRegion('广东', 'en')).toBe('广东');
    expect(formatRegion('印度尼西亚', 'en')).toBe('印度尼西亚');
    expect(formatRegion('未知', 'zh-CN')).toBe('未知');
    expect(formatRegion('', 'zh-CN')).toBe('');
  });

  it('keeps an unknown code as the code itself', () => {
    expect(formatRegion('AB', 'en')).toBe('AB');
    expect(formatRegion('ID', '!!')).toBe('ID');
  });

  it('only treats two uppercase letters as a code', () => {
    expect(isRegionCode('ID')).toBe(true);
    expect(isRegionCode('id')).toBe(false);
    expect(isRegionCode('IDN')).toBe(false);
    expect(isRegionCode('广东')).toBe(false);
  });
});
