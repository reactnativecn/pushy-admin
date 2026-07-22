import { Card, Skeleton, Table } from 'antd';

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

/**
 * 表格数据加载中的骨架屏组件
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card style={{ marginTop: 16 }}>
      <Skeleton
        active
        title={{ width: '20%' }}
        paragraph={false}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={Array.from({ length: rows }).map((_, index) => ({
          key: index,
        }))}
        columns={[
          {
            title: (
              <Skeleton active paragraph={false} title={{ width: '60%' }} />
            ),
            dataIndex: 'key',
            render: () => <Skeleton active paragraph={false} />,
          },
          {
            title: (
              <Skeleton active paragraph={false} title={{ width: '60%' }} />
            ),
            dataIndex: 'col2',
            render: () => <Skeleton active paragraph={false} />,
          },
          {
            title: (
              <Skeleton active paragraph={false} title={{ width: '60%' }} />
            ),
            dataIndex: 'col3',
            render: () => <Skeleton active paragraph={false} />,
          },
        ]}
        pagination={false}
      />
    </Card>
  );
}

/**
 * 卡片数据加载中的骨架屏组件
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: '16px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
        <Card key={`skeleton-card-${i}`}>
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Card>
      ))}
    </div>
  );
}
