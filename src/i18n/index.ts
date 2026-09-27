import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { insightsEn, insightsZh } from './insights-metrics';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
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
    },
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
