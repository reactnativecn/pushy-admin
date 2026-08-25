import { Grid } from 'antd';

/** md 断点以下视为移动端：表格走简洁分页、弹窗铺满宽度。 */
export const useIsMobile = () => {
  const screens = Grid.useBreakpoint();
  return !screens.md;
};

/** 弹窗宽度：桌面用给定宽度，移动端留 16px 边距铺满。 */
export const useModalWidth = (desktopWidth: number | string) => {
  const isMobile = useIsMobile();
  return isMobile ? 'calc(100vw - 32px)' : desktopWidth;
};
