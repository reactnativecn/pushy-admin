import type { MemberRole } from '@/types';
import type { ThemeMode } from '@/utils/theme-mode';

/**
 * 动态拼出来的 t(`a.b_${x}`) 逃得过 locales.test 的静态校验；
 * 把这些键写成字面量查表，漏翻译就会在测试里暴露。
 */
export const MEMBER_ROLE_LABEL_KEY: Record<MemberRole, string> = {
  admin: 'members.role_admin',
  developer: 'members.role_developer',
  viewer: 'members.role_viewer',
};

export const MEMBER_ROLE_DESC_KEY: Record<MemberRole, string> = {
  admin: 'members.role_admin_desc',
  developer: 'members.role_developer_desc',
  viewer: 'members.role_viewer_desc',
};

export const THEME_MODE_LABEL_KEY: Record<ThemeMode, string> = {
  auto: 'nav.theme_auto',
  light: 'nav.theme_light',
  dark: 'nav.theme_dark',
};
