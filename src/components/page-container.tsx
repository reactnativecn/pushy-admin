import { Typography } from 'antd';
import type { ReactNode } from 'react';
import { cn } from '@/utils/helper';

const { Title } = Typography;

interface PageContainerProps {
  /** 页面主标题，统一使用 level 4。 */
  title?: ReactNode;
  /** 标题下方的辅助说明文字。 */
  description?: ReactNode;
  /** 标题行右侧的操作区（搜索框、按钮等）。 */
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * 页面级容器：统一最大宽度、水平居中与标题层级。
 * 替代此前散落在各页面、且无 CSS 定义的 `page-section` 幽灵类，
 * 并统一 admin/apps 等页面参差不齐的标题层级（level 3/4/5 混用）。
 */
export function PageContainer({
  title,
  description,
  extra,
  className,
  children,
}: PageContainerProps) {
  const hasHeader = title || description || extra;
  return (
    <div className={cn('page-section', className)}>
      {hasHeader && (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            {title && (
              <Title level={4} className="m-0!">
                {title}
              </Title>
            )}
            {description && (
              <div className="text-sm text-text-secondary">{description}</div>
            )}
          </div>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

export default PageContainer;
