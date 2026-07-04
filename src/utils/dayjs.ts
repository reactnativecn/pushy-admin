import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';
import i18n from '@/i18n';
import 'dayjs/locale/zh-cn';

// English is dayjs' built-in default locale, no import needed.

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const toDayjsLocale = (language: string) =>
  language.toLowerCase().startsWith('zh') ? 'zh-cn' : 'en';

/**
 * Keep dayjs' global locale in sync with the active i18n language, so relative
 * times ("3 hours ago") and formatted dates localize correctly. Called once at
 * startup and again whenever the language changes.
 */
export const syncDayjsLocale = (language?: string) => {
  dayjs.locale(
    toDayjsLocale(language ?? i18n.resolvedLanguage ?? i18n.language),
  );
};

syncDayjsLocale();
i18n.on('languageChanged', syncDayjsLocale);

export default dayjs;
