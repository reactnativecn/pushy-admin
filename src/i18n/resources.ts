import { insightsEn, insightsZh } from './insights-metrics';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

// Runtime registration and locale validation share exactly the same catalog.
// Keeping this module side-effect free also avoids language detection in tests.
export const resources = {
  en: {
    translation: {
      ...en,
      app_insights: { ...en.app_insights, ...insightsEn },
    },
  },
  'zh-CN': {
    translation: {
      ...zhCN,
      app_insights: { ...zhCN.app_insights, ...insightsZh },
    },
  },
};
