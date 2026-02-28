import {
  ArrowRightOutlined,
  CloudDownloadOutlined,
  ExperimentOutlined,
  LinkOutlined,
  RestOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Dropdown,
  type MenuProps,
  Modal,
  Table,
} from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';

type DepChangeType = '新增' | '移除' | '版本变更';

type DepChangeRow = {
  key: string;
  dependency: string;
  oldVersion: string;
  newVersion: string;
  changeType: DepChangeType;
};

type DepChangeSummary = {
  added: number;
  removed: number;
  changed: number;
};

type DepChangeFilters = Record<DepChangeType, boolean>;

function getDepsChangeSummary(changes: DepChangeRow[]): DepChangeSummary {
  return changes.reduce(
    (acc, item) => {
      if (item.changeType === '新增') {
        acc.added += 1;
      } else if (item.changeType === '移除') {
        acc.removed += 1;
      } else {
        acc.changed += 1;
      }
      return acc;
    },
    { added: 0, removed: 0, changed: 0 },
  );
}

function getDepsChangeColumns({
  summary,
  filters,
  onFilterChange,
}: {
  summary: DepChangeSummary;
  filters: DepChangeFilters;
  onFilterChange: (type: DepChangeType, checked: boolean) => void;
}) {
  return [
    {
      title: (
        <span>
          依赖（
          <Checkbox
            checked={filters.新增}
            onChange={({ target }) => {
              onFilterChange('新增', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#dc2626', fontWeight: 700 }}>
            新增 {summary.added}
          </span>
          ，
          <Checkbox
            checked={filters.移除}
            onChange={({ target }) => {
              onFilterChange('移除', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#16a34a', fontWeight: 700 }}>
            移除 {summary.removed}
          </span>
          ，
          <Checkbox
            checked={filters.版本变更}
            onChange={({ target }) => {
              onFilterChange('版本变更', target.checked);
            }}
          />
          <span className="ml-1" style={{ color: '#d97706', fontWeight: 700 }}>
            变更 {summary.changed}
          </span>
          ）
        </span>
      ),
      dataIndex: 'dependency',
      key: 'dependency',
      ellipsis: true,
    },
    {
      title: '版本变化',
      key: 'versionChange',
      ellipsis: true,
      render: (_: unknown, record: DepChangeRow) => {
        if (record.changeType === '版本变更') {
          return (
            <span className="font-mono">
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {record.oldVersion}
              </span>
              <ArrowRightOutlined className="mx-2 text-gray-400" />
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {record.newVersion}
              </span>
            </span>
          );
        }

        if (record.changeType === '新增') {
          return (
            <span className="font-mono">
              <span style={{ color: '#dc2626', fontWeight: 700 }}>新增</span>
              <span className="mx-2 text-gray-400">|</span>
              <span style={{ color: '#6b7280' }}>{record.oldVersion}</span>
              <ArrowRightOutlined className="mx-2 text-gray-400" />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                {record.newVersion}
              </span>
            </span>
          );
        }

        return (
          <span className="font-mono">
            <span style={{ color: '#16a34a', fontWeight: 700 }}>移除</span>
            <span className="mx-2 text-gray-400">|</span>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>
              {record.oldVersion}
            </span>
            <ArrowRightOutlined className="mx-2 text-gray-400" />
            <span style={{ color: '#6b7280' }}>{record.newVersion}</span>
          </span>
        );
      },
    },
  ];
}

const DepsChangeConfirmContent = ({
  packageName,
  versionDisplayName,
  changes,
}: {
  packageName: string;
  versionDisplayName: string | number;
  changes: DepChangeRow[];
}) => {
  const [filters, setFilters] = useState<DepChangeFilters>({
    新增: true,
    移除: true,
    版本变更: true,
  });

  const summary = useMemo(() => getDepsChangeSummary(changes), [changes]);
  const filteredChanges = useMemo(
    () => changes.filter((item) => filters[item.changeType]),
    [changes, filters],
  );
  const columns = useMemo(
    () =>
      getDepsChangeColumns({
        summary,
        filters,
        onFilterChange: (type, checked) => {
          setFilters((prev) => ({ ...prev, [type]: checked }));
        },
      }),
    [summary, filters],
  );

  return (
    <div>
      <div>目标原生包：{packageName}</div>
      <div>热更包：{versionDisplayName}</div>
      <Alert
        className="mt-3"
        showIcon
        type="warning"
        message={
          <span>
            如果变更的依赖是纯 JS 模块，则一般没有影响；若包含
            <strong>原生代码</strong>
            的新增或变化，热更可能导致功能不正常甚至闪退。建议仔细检查并在正式发布前使用扫码功能完整测试。
          </span>
        }
      />
      <Table<DepChangeRow>
        className="mt-3"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={filteredChanges}
        scroll={{ y: 320 }}
        locale={{ emptyText: '当前筛选条件下无依赖变化' }}
      />
    </div>
  );
};

function getDepsChanges(
  oldDeps?: Record<string, string>,
  newDeps?: Record<string, string>,
): DepChangeRow[] | null {
  if (!oldDeps || !newDeps) {
    return null;
  }
  const rows: DepChangeRow[] = [];
  const keys = Object.keys({ ...oldDeps, ...newDeps }).sort((a, b) =>
    a.localeCompare(b),
  );
  for (const key of keys) {
    const oldValue = oldDeps[key];
    const newValue = newDeps[key];
    if (oldValue === undefined && newValue !== undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: '-',
        newVersion: newValue,
        changeType: '新增',
      });
      continue;
    }
    if (oldValue !== undefined && newValue === undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: '-',
        changeType: '移除',
      });
      continue;
    }
    if (
      oldValue !== newValue &&
      oldValue !== undefined &&
      newValue !== undefined
    ) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: newValue,
        changeType: '版本变更',
      });
    }
  }
  return rows;
}

const BindPackage = ({
  versionId,
  config,
  versionDeps,
  versionName,
}: {
  versionId: number;
  config?: {
    rollout?: {
      [packageVersion: string]: number | null;
    };
  };
  versionDeps?: Record<string, string>;
  versionName?: string;
}) => {
  const {
    packages: allPackages,
    appId,
    bindings,
    packageMap,
  } = useManageContext();
  const availablePackages = allPackages;

  const publishToPackage = (
    pkg: { id: number; name: string; deps?: Record<string, string> },
    rollout?: number,
  ) => {
    const publish = () =>
      api.upsertBinding({
        appId,
        packageId: pkg.id,
        versionId,
        rollout,
      });

    const changes = getDepsChanges(pkg.deps, versionDeps);
    if (!changes || changes.length === 0) {
      void publish();
      return;
    }

    Modal.confirm({
      title: '检测到依赖变化，确认继续发布？',
      maskClosable: true,
      okButtonProps: { danger: true },
      okText: '继续发布',
      cancelText: '取消',
      width: 820,
      content: (
        <DepsChangeConfirmContent
          packageName={pkg.name}
          versionDisplayName={versionName || versionId}
          changes={changes}
        />
      ),
      async onOk() {
        await publish();
      },
    });
  };

  const bindedPackages = (() => {
    const result = [];
    const legacyBindings = [];
    for (const p of allPackages) {
      if (p.versions?.id === versionId) {
        const legacyConfig = config?.rollout?.[p.name];
        legacyBindings.push({
          packageId: p.id,
          rollout: legacyConfig,
        });
      }
    }
    const matchedBindings: {
      id?: number;
      packageId: number;
      rollout: number | null | undefined;
    }[] = legacyBindings.concat(
      bindings.filter((b) => b.versionId === versionId),
    );

    if (matchedBindings.length === 0 || allPackages.length === 0) return null;

    for (const binding of matchedBindings) {
      const p = packageMap.get(binding.packageId);
      if (!p) {
        continue;
      }
      const rolloutConfig = binding.rollout;
      const isFull =
        rolloutConfig === 100 ||
        rolloutConfig === undefined ||
        rolloutConfig === null;
      const rolloutConfigNumber = Number(rolloutConfig);
      const items: MenuProps['items'] = isFull
        ? []
        : [
            {
              key: 'full',
              label: '全量',
              icon: <CloudDownloadOutlined />,
              onClick: () => publishToPackage(p),
            },
          ];

      if (rolloutConfigNumber < 50 && !isFull) {
        items.push({
          key: 'gray',
          label: '灰度',
          icon: <ExperimentOutlined />,
          children: [1, 2, 5, 10, 20, 50]
            .filter((percentage) => percentage > rolloutConfigNumber)
            .map((percentage) => ({
              key: `${percentage}`,
              label: `${percentage}%`,
              onClick: () => publishToPackage(p, percentage),
            })),
        });
      }
      if (items.length > 0) {
        items.push({ type: 'divider' });
      }
      items.push({
        key: 'unpublish',
        label: '取消发布',
        icon: <RestOutlined />,
        onClick: () => {
          const bindingId = binding.id;
          if (bindingId) {
            api.deleteBinding({ appId, bindingId });
          } else {
            api.updatePackage({
              appId,
              packageId: p.id,
              params: { versionId: null },
            });
          }
        },
      });
      const button = (
        <Button
          size="small"
          color="primary"
          variant={isFull ? 'filled' : 'dashed'}
        >
          <span className="font-bold">{p.name}</span>
          <span className="text-xs">{isFull ? '' : `(${rolloutConfig}%)`}</span>
        </Button>
      );
      result.push(
        <Dropdown key={p.id} menu={{ items }}>
          {button}
        </Dropdown>,
      );
    }
    return result;
  })();

  return (
    <div className="flex flex-wrap gap-1">
      {bindedPackages}
      {availablePackages.length !== 0 && (
        <Dropdown
          menu={{
            items: availablePackages.map((p) => ({
              key: `pkg-${p.id}`,
              label: p.name,
              children: [
                {
                  key: `pkg-${p.id}-full`,
                  label: '全量',
                  icon: <CloudDownloadOutlined />,
                  onClick: () => publishToPackage(p),
                },
                {
                  key: `pkg-${p.id}-gray`,
                  label: '灰度',
                  icon: <ExperimentOutlined />,
                  children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
                    key: `pkg-${p.id}-gray-${percentage}`,
                    label: `${percentage}%`,
                    onClick: () => publishToPackage(p, percentage),
                  })),
                },
              ],
            })),
          }}
          className="ant-typography-edit"
        >
          <Button type="link" size="small" icon={<LinkOutlined />}>
            发布
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default BindPackage;
