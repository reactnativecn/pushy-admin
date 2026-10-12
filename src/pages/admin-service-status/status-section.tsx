import {
  Card,
  type CardProps,
  Space,
  Statistic,
  type StatisticProps,
  Typography,
} from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

/**
 * 服务状态页底部各运维面板的外壳：带图标的标题、右上角附加信息、加载态。
 * error 时整块隐藏（旧版服务端没有对应接口）；传了 empty 时，加载结束仍无数据也隐藏。
 * 不传 loading 的面板在加载中同样按 empty 处理，即数据到了才出现。
 */
export function StatusSection({
  children,
  empty = false,
  error,
  extra,
  icon,
  loading,
  title,
  titleExtra,
}: {
  children: ReactNode;
  empty?: boolean;
  error: boolean;
  extra?: ReactNode;
  icon: ReactNode;
  loading?: boolean;
  title: ReactNode;
  /** 标题后面追加的内容（如版本、角色标签） */
  titleExtra?: ReactNode;
}) {
  if (error || (!loading && empty)) {
    return null;
  }
  return (
    <Card
      className="mt-4"
      extra={extra}
      loading={loading}
      title={
        <Space wrap>
          {icon}
          {title}
          {titleExtra}
        </Space>
      }
    >
      {children}
    </Card>
  );
}

/** 指标小卡片：Statistic 加一行说明，其余内容（进度条、标签等）放 children。 */
export function StatCard({
  children,
  detail,
  detailType = 'secondary',
  size = 'small',
  suffix,
  title,
  value,
}: {
  children?: ReactNode;
  /** Statistic 下方的说明行 */
  detail?: ReactNode;
  detailType?: 'secondary' | 'warning' | 'danger';
  size?: CardProps['size'];
  suffix?: ReactNode;
  title: ReactNode;
  value: StatisticProps['value'];
}) {
  return (
    <Card size={size}>
      <Statistic suffix={suffix} title={title} value={value} />
      {detail != null && detail !== false && (
        <Text type={detailType}>{detail}</Text>
      )}
      {children}
    </Card>
  );
}
