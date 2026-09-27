import { expect, test } from 'bun:test';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import { resources } from './resources';

test('runtime translations use canonical JSON without duplicate overrides', () => {
  expect(resources.en.translation).toBe(en);
  expect(resources['zh-CN'].translation).toBe(zhCN);
});
