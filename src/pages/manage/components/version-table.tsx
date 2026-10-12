import {
  InfoCircleOutlined,
  QrcodeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Input,
  Popover,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnType } from 'antd/lib/table';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteVersions, useUpdateVersion } from '@/services/mutations';
import type { Version } from '@/types';
import { useVersions, useWorkspacePermissions } from '@/utils/hooks';
import { useIsMobile } from '@/utils/responsive';
import { getTablePagination } from '@/utils/table-state';
import { useManageContext } from '../hooks/useManageContext';
import BindPackage from './bind-package';
import { CommitModal } from './commit';
import { confirmDelete } from './confirm-delete';
import { DepsModal } from './deps-table';
import { buildNameCellMenu } from './name-cell-menu';
import PublishFeatureTable from './publish-feature-table';
import {
  type ColumnWidths,
  getStoredWidth,
  type ResizableColumnKey,
  ResizableHeaderCell,
  storeColumnWidth,
} from './resizable-header';
import { TestQrCodeModal } from './test-qr-modal';
import { EditFieldModal, TextColumn } from './version-text-cell';

/**
 * Outcome of the CLI's Hermes base equivalence check for this version.
 * Only a base that was used is shown: it explains why this version's patches
 * are smaller. `rejected` / `dump-failed` mean the CLI fell back to a plain
 * compile, which is the correct, fully working result and needs nothing from
 * the developer -- and a rejection is more often a gap in our own
 * disassembly normalization than a real bytecode difference. It stays in
 * `versions.hermesBaseOutcome` / `hermesBaseDetail` for us to query; a red
 * tag on a healthy release only worries people.
 */
const HermesBaseTag = ({ record }: { record: Version }) => {
  const { t } = useTranslation();
  const { packages } = useManageContext();
  if (record.hermesBaseOutcome !== 'used') return null;
  // A version base carries its id; a native-package base only its hash, and a
  // local base file (--hermesBase <path>) neither.
  const basePackage =
    record.baseVersionId == null && record.baseHash
      ? packages.find((item) => item.hash === record.baseHash)
      : undefined;
  const tip =
    record.baseVersionId != null
      ? t('version_table.hermes_base_used_tip', { id: record.baseVersionId })
      : basePackage
        ? t('version_table.hermes_base_used_tip_package', {
            name: basePackage.name,
          })
        : t('version_table.hermes_base_used_tip_other');
  return (
    <Tooltip
      title={<span className="whitespace-pre-wrap break-all">{tip}</span>}
    >
      <Tag color="green" className="mt-0.5 text-[11px] leading-4 px-1 mr-0">
        {t('version_table.hermes_base_used')}
      </Tag>
    </Tooltip>
  );
};

const VersionNameCell = ({
  record,
  canPublish,
}: {
  record: Version;
  canPublish: boolean;
}) => {
  const { t } = useTranslation();
  const { appId } = useManageContext();
  const updateVersion = useUpdateVersion();
  const deleteVersions = useDeleteVersions();
  const [modalType, setModalType] = useState<
    'edit' | 'deps' | 'commit' | 'qr' | null
  >(null);

  const menuItems = buildNameCellMenu({
    name: record.name,
    canPublish,
    t,
    extra: [
      {
        key: 'qr',
        icon: <QrcodeOutlined />,
        label: t('version_table.qr_title'),
      },
    ],
  });

  return (
    <div className="w-full">
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === 'delete') {
              confirmDelete({
                title: t('version_table.delete_title'),
                names: record.name,
                onOk: () =>
                  deleteVersions.mutateAsync({
                    appId,
                    versionIds: [record.id],
                  }),
              });
            } else {
              setModalType(key as 'edit' | 'deps' | 'commit' | 'qr');
            }
          },
        }}
        trigger={['hover']}
        placement="bottomLeft"
      >
        <div className="w-full cursor-pointer py-1 px-1.5 -mx-1.5 rounded hover:bg-[var(--ant-color-fill-secondary)] transition-colors">
          <Typography.Text
            strong
            title={record.name}
            className="block text-[var(--ant-color-text)] truncate"
          >
            {record.name}
          </Typography.Text>
          <HermesBaseTag record={record} />
        </div>
      </Dropdown>

      {modalType === 'edit' && (
        <EditFieldModal
          title={t('version_table.col_version')}
          isJson={false}
          initialValue={record.name ?? ''}
          saving={updateVersion.isPending}
          onClose={() => setModalType(null)}
          onSubmit={(newValue) =>
            updateVersion.mutateAsync({
              appId,
              versionId: record.id,
              params: { name: newValue },
            })
          }
        />
      )}
      {modalType === 'deps' && (
        <DepsModal
          open
          onClose={() => setModalType(null)}
          deps={record.deps}
          name={`${t('version_table.title')} ${record.name}`}
        />
      )}
      {modalType === 'commit' && (
        <CommitModal
          open
          onClose={() => setModalType(null)}
          commit={record.commit}
        />
      )}
      {modalType === 'qr' && (
        <TestQrCodeModal
          open
          onClose={() => setModalType(null)}
          name={record.name}
          hash={record.hash}
        />
      )}
    </div>
  );
};

function getColumns(
  t: (key: string) => string,
  canPublish: boolean,
  widths: ColumnWidths,
  onResize: (key: ResizableColumnKey) => (width: number) => void,
): ColumnType<Version>[] {
  return [
    {
      title: t('version_table.col_version'),
      dataIndex: 'name',
      width: widths.name,
      onHeaderCell: () => ({
        width: widths.name,
        minWidth: 100,
        onResize: onResize('name'),
      }),
      render: (_, record) => (
        <VersionNameCell record={record} canPublish={canPublish} />
      ),
    },
    {
      title: t('version_table.col_description'),
      dataIndex: 'description',
      responsive: ['md'],
      width: widths.description,
      onHeaderCell: () => ({
        width: widths.description,
        minWidth: 120,
        onResize: onResize('description'),
      }),
      render: (_, record) => (
        <TextColumn
          record={record}
          recordKey="description"
          title={t('version_table.col_description')}
          canPublish={canPublish}
          className="block max-w-[13rem] md:w-52"
          showPopover
        />
      ),
    },
    {
      title: t('version_table.col_metadata'),
      dataIndex: 'metaInfo',
      responsive: ['lg'],
      width: widths.metaInfo,
      onHeaderCell: () => ({
        width: widths.metaInfo,
        minWidth: 100,
        onResize: onResize('metaInfo'),
      }),
      render: (_, record) => (
        <TextColumn
          record={record}
          recordKey="metaInfo"
          title={t('version_table.col_metadata')}
          canPublish={canPublish}
          className="block max-w-[8rem] md:w-32"
          showPopover
        />
      ),
    },
    {
      title: (
        <Popover content={<PublishFeatureTable />}>
          {t('version_table.col_publish')}
          <span className="text-amber-600">
            (<InfoCircleOutlined />
            {t('version_table.col_publish_info')})
          </span>
        </Popover>
      ),
      dataIndex: 'packages',
      render: (_, record) =>
        canPublish ? (
          <BindPackage
            config={record.config}
            versionId={record.id}
            versionDeps={record.deps}
            versionName={record.name}
          />
        ) : (
          // 只读角色:仅展示已绑定的原生包名,不提供绑定/发布交互
          <span className="text-gray-500 text-sm">
            {record.packages?.map((item) => item.name).join(', ') || '-'}
          </span>
        ),
    },
    {
      title: t('version_table.col_uploaded'),
      dataIndex: 'createdAt',
      responsive: ['md'],
      width: widths.createdAt,
      onHeaderCell: () => ({
        width: widths.createdAt,
        minWidth: 120,
        onResize: onResize('createdAt'),
      }),
      render: (_, record) => (
        <TextColumn
          record={record}
          recordKey="createdAt"
          isEditable={false}
          canPublish={canPublish}
        />
      ),
    },
  ];
}

export default function VersionTable() {
  const { t } = useTranslation();
  const { canPublish } = useWorkspacePermissions();
  const [columnWidths, setColumnWidths] = useState(() => ({
    name: getStoredWidth('name'),
    description: getStoredWidth('description'),
    metaInfo: getStoredWidth('metaInfo'),
    createdAt: getStoredWidth('createdAt'),
  }));

  const handleResize = useCallback(
    (key: ResizableColumnKey) => (newWidth: number) => {
      setColumnWidths((prev) => {
        const updated = { ...prev, [key]: newWidth };
        storeColumnWidth(key, newWidth);
        return updated;
      });
    },
    [],
  );

  const columns = useMemo(
    () => getColumns(t, canPublish, columnWidths, handleResize),
    [t, canPublish, columnWidths, handleResize],
  );
  const deleteVersions = useDeleteVersions();
  const isMobile = useIsMobile();
  const { appId } = useManageContext();
  const [selected, setSelected] = useState<number[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState('');
  const { versions, count, isLoading } = useVersions({
    appId,
    offset,
    limit: pageSize,
  });
  const normalizedSearch = search.trim().toLowerCase();
  const filteredVersions = useMemo(
    () =>
      normalizedSearch
        ? versions.filter(
            (item) =>
              item.name.toLowerCase().includes(normalizedSearch) ||
              item.description?.toLowerCase().includes(normalizedSearch),
          )
        : versions,
    [versions, normalizedSearch],
  );

  return (
    <Table
      className="versions"
      rowKey="id"
      components={{
        header: {
          cell: ResizableHeaderCell,
        },
      }}
      title={() => (
        <div className="flex items-center gap-2">
          {!isMobile && <span>{t('version_table.title')}</span>}
          <Input
            allowClear
            variant="borderless"
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder={t('common.search')}
            value={search}
            onChange={({ target }) => setSearch(target.value)}
            className="shrink-0 rounded bg-gray-100 px-2 text-sm leading-8"
            style={{ width: 100 }}
          />
        </div>
      )}
      columns={columns}
      dataSource={filteredVersions}
      size={isMobile ? 'small' : 'middle'}
      pagination={{
        ...getTablePagination(
          { isMobile, page: offset / pageSize + 1, pageSize },
          count,
          (total) => t('version_table.total_versions', { total }),
        ),
        onChange(page, size) {
          if (size) {
            setOffset((page - 1) * size);
            setPageSize(size);
          }
        },
      }}
      scroll={{ x: 960 }}
      rowSelection={
        canPublish
          ? {
              selections: isMobile
                ? undefined
                : [
                    Table.SELECTION_ALL,
                    Table.SELECTION_INVERT,
                    Table.SELECTION_NONE,
                  ],
              onChange: (keys) => setSelected(keys as number[]),
            }
          : undefined
      }
      loading={isLoading}
      footer={
        selected.length && canPublish
          ? () => (
              <Button
                className={isMobile ? 'w-full' : undefined}
                onClick={() =>
                  confirmDelete({
                    title: t('version_table.delete_title'),
                    names: versions.filter((v) => selected.includes(v.id)),
                    onOk: () =>
                      deleteVersions.mutateAsync({
                        appId,
                        versionIds: selected,
                      }),
                  })
                }
                danger
              >
                {t('version_table.delete_button')}
              </Button>
            )
          : undefined
      }
    />
  );
}
