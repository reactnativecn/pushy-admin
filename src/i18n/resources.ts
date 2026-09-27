import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

// Canonical JSON catalogs are the single source for runtime and validation.
export const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
};
