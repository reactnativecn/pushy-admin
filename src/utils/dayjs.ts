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
const syncDayjsLocale = (language?: string) => {
  dayjs.locale(
    toDayjsLocale(language ?? i18n.resolvedLanguage ?? i18n.language),
  );
};

// i18n 带着内置 resources 同步初始化，import 到这里时 initialized /
// 首次 languageChanged 早已触发，所以启动时要主动同步一次。
syncDayjsLocale();
i18n.on('languageChanged', syncDayjsLocale);

export default dayjs;
