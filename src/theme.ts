import type { ThemeConfig } from 'antd';

/**
 * 品牌主色，与 index.html 的 theme-color、logo 保持一致。
 * 作为全站唯一色彩来源：antd 组件走 token，Tailwind 通过 index.css 的
 * @theme 映射消费 antd 暴露的 CSS 变量（--ant-color-*）。
 */
export const BRAND_PRIMARY = '#4483ed';

export const themeConfig: ThemeConfig = {
  // 开启 CSS 变量模式，antd 会输出 --ant-color-primary 等变量，供 Tailwind 复用。
  cssVar: {},
  token: {
    colorPrimary: BRAND_PRIMARY,
  },
};
