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
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';

type DepChangeType = 'added' | 'removed' | 'changed';

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

type PublishPackage = {
  id: number;
  name: string;
  deps?: Record<string, string>;
};

type DepsChangePackage = {
  pkg: PublishPackage;
  changes: DepChangeRow[];
};

function getDepsChangeSummary(changes: DepChangeRow[]): DepChangeSummary {
  return changes.reduce(
    (acc, item) => {
      if (item.changeType === 'added') {
        acc.added += 1;
      } else if (item.changeType === 'removed') {
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
  t,
}: {
  summary: DepChangeSummary;
  filters: DepChangeFilters;
  onFilterChange: (type: DepChangeType, checked: boolean) => void;
  t: (key: string) => string;
}) {
  return [
    {
      title: (
        <span>
          {t('bind_package.col_dependencies')}（
          <Checkbox
            checked={filters.added}
            onChange={({ target }) => {
              onFilterChange('added', target.checked);
            }}
          />
          <span className="ml-1 font-bold text-error">
            {t('bind_package.change_added')} {summary.added}
          </span>
          ，
          <Checkbox
            checked={filters.removed}
            onChange={({ target }) => {
              onFilterChange('removed', target.checked);
            }}
          />
          <span className="ml-1 font-bold text-success">
            {t('bind_package.change_removed')} {summary.removed}
          </span>
          ，
          <Checkbox
            checked={filters.changed}
            onChange={({ target }) => {
              onFilterChange('changed', target.checked);
            }}
          />
          <span className="ml-1 font-bold text-warning">
            {t('bind_package.change_changed')} {summary.changed}
          </span>
          ）
        </span>
      ),
      dataIndex: 'dependency',
      key: 'dependency',
      ellipsis: true,
    },
    {
      title: t('bind_package.col_version_change'),
      key: 'versionChange',
      ellipsis: true,
      render: (_: unknown, record: DepChangeRow) => {
        if (record.changeType === 'changed') {
          return (
            <span className="font-mono">
              <span className="font-semibold text-warning">
                {record.oldVersion}
              </span>
              <ArrowRightOutlined className="mx-2 text-gray-400" />
              <span className="font-semibold text-warning">
                {record.newVersion}
              </span>
            </span>
          );
        }

        if (record.changeType === 'added') {
          return (
            <span className="font-mono">
              <span className="font-bold text-error">
                {t('bind_package.change_added')}
              </span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-text-tertiary">{record.oldVersion}</span>
              <ArrowRightOutlined className="mx-2 text-gray-400" />
              <span className="font-semibold text-error">
                {record.newVersion}
              </span>
            </span>
          );
        }

        return (
          <span className="font-mono">
            <span className="font-bold text-success">
              {t('bind_package.change_removed')}
            </span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-semibold text-success">
              {record.oldVersion}
            </span>
            <ArrowRightOutlined className="mx-2 text-gray-400" />
            <span className="text-text-tertiary">{record.newVersion}</span>
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
  const { t } = useTranslation();
  const [filters, setFilters] = useState<DepChangeFilters>({
    added: true,
    removed: true,
    changed: true,
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
        t,
      }),
    [summary, filters, t],
  );

  return (
    <div>
      <div>
        {t('bind_package.target_package')}
        {packageName}
      </div>
      <div>
        {t('bind_package.ota_version')}
        {versionDisplayName}
      </div>
      <Alert
        className="mt-3"
        showIcon
        type="warning"
        message={t('bind_package.native_warning')}
      />
      <Table<DepChangeRow>
        className="mt-3"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={filteredChanges}
        scroll={{ y: 320 }}
        locale={{ emptyText: t('bind_package.no_dep_changes') }}
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
  const keys = Array.from(
    new Set([...Object.keys(oldDeps || {}), ...Object.keys(newDeps || {})]),
  ).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const oldValue = oldDeps[key];
    const newValue = newDeps[key];
    if (oldValue === undefined && newValue !== undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: '-',
        newVersion: newValue,
        changeType: 'added',
      });
      continue;
    }
    if (oldValue !== undefined && newValue === undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: '-',
        changeType: 'removed',
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
        changeType: 'changed',
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
  const { t } = useTranslation();
  const {
    packages: allPackages,
    appId,
    bindings,
    packageMap,
  } = useManageContext();
  const legacyBindings = allPackages
    .filter((p) => p.versions?.id === versionId)
    .map((p) => ({
      packageId: p.id,
      rollout: config?.rollout?.[p.name],
    }));
  const matchedBindings: {
    id?: number;
    packageId: number;
    rollout: number | null | undefined;
  }[] = legacyBindings.concat(
    bindings.filter((b) => b.versionId === versionId),
  );
  const matchedPackageIds = new Set(
    matchedBindings.map((binding) => binding.packageId),
  );
  const availablePackages = allPackages.filter(
    (p) => !matchedPackageIds.has(p.id),
  );

  const publishToPackages = (pkgs: PublishPackage[], rollout?: number) => {
    if (pkgs.length === 0) {
      return;
    }

    const publish = () => {
      if (pkgs.length === 1) {
        return api.upsertBinding({
          appId,
          packageId: pkgs[0].id,
          versionId,
          rollout,
        });
      }

      return api.upsertBindings({
        appId,
        packageIds: pkgs.map((pkg) => pkg.id),
        versionId,
        rollout,
      });
    };

    const depsChangedPackages = pkgs.reduce<DepsChangePackage[]>((acc, pkg) => {
      const changes = getDepsChanges(pkg.deps, versionDeps);
      if (changes?.length) {
        acc.push({ pkg, changes });
      }
      return acc;
    }, []);
    if (depsChangedPackages.length === 0) {
      void publish();
      return;
    }

    const content =
      depsChangedPackages.length === 1 ? (
        <DepsChangeConfirmContent
          packageName={depsChangedPackages[0].pkg.name}
          versionDisplayName={versionName || versionId}
          changes={depsChangedPackages[0].changes}
        />
      ) : (
        <div className="max-h-96 space-y-6 overflow-y-auto pr-2">
          {depsChangedPackages.map(({ pkg, changes }) => (
            <DepsChangeConfirmContent
              key={pkg.id}
              packageName={pkg.name}
              versionDisplayName={versionName || versionId}
              changes={changes}
            />
          ))}
        </div>
      );

    Modal.confirm({
      title: t('bind_package.dep_changes_title'),
      maskClosable: true,
      okButtonProps: { danger: true },
      okText: t('bind_package.publish_anyway'),
      cancelText: t('bind_package.cancel'),
      width: 820,
      content,
      async onOk() {
        await publish();
      },
    });
  };

  const publishToPackage = (pkg: PublishPackage, rollout?: number) =>
    publishToPackages([pkg], rollout);

  const publishMenuItems: MenuProps['items'] = [];
  if (availablePackages.length > 1) {
    publishMenuItems.push(
      {
        key: 'all',
        label: t('bind_package.all_packages'),
        children: [
          {
            key: 'all-full',
            label: t('bind_package.full_release'),
            icon: <CloudDownloadOutlined />,
            onClick: () => publishToPackages(availablePackages),
          },
          {
            key: 'all-gray',
            label: t('bind_package.staged_release'),
            icon: <ExperimentOutlined />,
            children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
              key: `all-gray-${percentage}`,
              label: `${percentage}%`,
              onClick: () => publishToPackages(availablePackages, percentage),
            })),
          },
        ],
      },
      { type: 'divider' },
    );
  }
  publishMenuItems.push(
    ...availablePackages.map((p) => ({
      key: `pkg-${p.id}`,
      label: p.name,
      children: [
        {
          key: `pkg-${p.id}-full`,
          label: t('bind_package.full_release'),
          icon: <CloudDownloadOutlined />,
          onClick: () => publishToPackage(p),
        },
        {
          key: `pkg-${p.id}-gray`,
          label: t('bind_package.staged_release'),
          icon: <ExperimentOutlined />,
          children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
            key: `pkg-${p.id}-gray-${percentage}`,
            label: `${percentage}%`,
            onClick: () => publishToPackage(p, percentage),
          })),
        },
      ],
    })),
  );

  const bindedPackages = (() => {
    const result = [];
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
              label: t('bind_package.full_release'),
              icon: <CloudDownloadOutlined />,
              onClick: () => publishToPackage(p),
            },
          ];

      if (rolloutConfigNumber < 50 && !isFull) {
        items.push({
          key: 'gray',
          label: t('bind_package.staged_release'),
          icon: <ExperimentOutlined />,
          children: [1, 2, 5, 10, 20, 50].reduce<
            NonNullable<MenuProps['items']>
          >((acc, percentage) => {
            if (percentage > rolloutConfigNumber) {
              acc.push({
                key: `${percentage}`,
                label: `${percentage}%`,
                onClick: () => publishToPackage(p, percentage),
              });
            }
            return acc;
          }, []),
        });
      }
      if (items.length > 0) {
        items.push({ type: 'divider' });
      }
      items.push({
        key: 'unpublish',
        label: t('bind_package.unpublish'),
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
            items: publishMenuItems,
          }}
          className="ant-typography-edit"
        >
          <Button type="link" size="small" icon={<LinkOutlined />}>
            {t('bind_package.publish')}
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default BindPackage;
