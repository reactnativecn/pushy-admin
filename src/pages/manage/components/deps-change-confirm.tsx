import { ArrowRightOutlined } from '@ant-design/icons';
import { Alert, Checkbox, Table } from 'antd';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  type DepChangeFilters,
  type DepChangeRow,
  type DepChangeSummary,
  type DepChangeType,
  getDepsChangeSummary,
} from './bind-package.logic';

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

/** 发布前的依赖变更确认：列出目标原生包与热更版本之间的 JS 依赖差异 */
export const DepsChangeConfirmContent = ({
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
        message={
          <Trans
            i18nKey="bind_package.native_warning"
            components={{ strong: <strong /> }}
          />
        }
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
