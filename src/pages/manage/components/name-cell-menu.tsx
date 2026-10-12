import {
  DeleteOutlined,
  EditOutlined,
  JavaScriptOutlined,
  PullRequestOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

type MenuItems = NonNullable<MenuProps['items']>;

/**
 * 版本表、原生包列表名称单元格的悬停菜单：
 * 名称分组头 → 编辑（需发布权限）→ JS 依赖 → 提交记录 → extra → 删除（需发布权限）。
 * 两边各自的附加项（二维码、指纹/构建时间）通过 extra 插在提交记录之后。
 */
export function buildNameCellMenu({
  name,
  canPublish,
  t,
  extra = [],
}: {
  name: string;
  canPublish: boolean;
  t: (key: string) => string;
  extra?: MenuItems;
}): MenuItems {
  return [
    {
      type: 'group',
      label: (
        <span className="font-semibold text-xs text-[var(--ant-color-text)] max-w-[240px] truncate block">
          {name}
        </span>
      ),
    },
    {
      type: 'divider',
    },
    ...(canPublish
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('common.edit'),
          },
        ]
      : []),
    {
      key: 'deps',
      icon: <JavaScriptOutlined />,
      label: t('deps_table.js_deps_heading'),
    },
    {
      key: 'commit',
      icon: <PullRequestOutlined />,
      label: t('commit.title'),
    },
    ...extra,
    ...(canPublish
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: t('common.delete'),
            danger: true,
          },
        ]
      : []),
  ];
}
