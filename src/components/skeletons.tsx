import { Card, Skeleton } from 'antd';

export interface SkeletonProps {
  height?: number | string;
  className?: string;
}

/**
 * 图表数据加载中的骨架屏组件
 */
export function ChartSkeleton({ height = 300, className }: SkeletonProps) {
  return (
    <Card
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Skeleton active paragraph={{ rows: 4 }} title={{ width: '30%' }} />
    </Card>
  );
}
