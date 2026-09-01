import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  JavaScriptOutlined,
  PullRequestOutlined,
  QrcodeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  type MenuProps,
  Modal,
  Popover,
  QRCode,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnType } from 'antd/lib/table';
import dayjs from 'dayjs';
import {
  type ComponentProps,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { TextContent } from 'vanilla-jsoneditor';
import { TEST_QR_CODE_DOC } from '@/constants/links';
import { useDeleteVersions, useUpdateVersion } from '@/services/mutations';
import type { Version } from '@/types';
import { useVersions, useWorkspacePermissions } from '@/utils/hooks';
import { useIsMobile } from '@/utils/responsive';
import { safeStorage } from '@/utils/storage';
import { getTablePagination } from '@/utils/table-state';
import { useManageContext } from '../hooks/useManageContext';
import BindPackage from './bind-package';
import { CommitModal } from './commit';
import { DepsModal } from './deps-table';
import PublishFeatureTable from './publish-feature-table';

const JsonEditor = lazy(() => import('./json-editor'));

const DEEP_LINK_EXAMPLE = 'pushy://';

function getDeepLinkError(deepLink: string, t: (key: string) => string) {
  if (!deepLink) {
    return t('version_table.deep_link_required');
  }
  if (/^https?:\/\//i.test(deepLink)) {
    return t('version_table.deep_link_not_url');
  }
  if (/[?#]/.test(deepLink) || !deepLink.endsWith('://')) {
    return t('version_table.deep_link_format');
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\/$/i.test(deepLink)) {
    return t('version_table.deep_link_scheme');
  }
  return '';
}

// 沿用 ManageContext 时期的 key，老用户已存的 deep link 不会丢
const deepLinkStorageKey = (appId: number) => `${appId}_deeplink`;

export const TestQrCodeModal = ({
  open,
  onClose,
  name,
  hash,
}: {
  open: boolean;
  onClose: () => void;
  name?: string;
  hash: string;
}) => {
  const { t } = useTranslation();
  const { appId } = useManageContext();
  // deep link 只有这个弹层用到，状态放本地：每敲一个字只重渲染当前行的二维码，
  // 不再经 ManageContext 波及整张表。各行之间靠 localStorage 共享，弹层打开时回读。
  const [deepLink, setDeepLink] = useState(
    () => safeStorage.get(deepLinkStorageKey(appId)) ?? '',
  );
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);
  const normalizedDeepLink = deepLink.trim();
  const deepLinkError = enableDeepLink
    ? getDeepLinkError(normalizedDeepLink, t)
    : '';

  const isDeepLinkValid = enableDeepLink && !deepLinkError;

  useEffect(() => {
    if (open) {
      const stored = safeStorage.get(deepLinkStorageKey(appId));
      if (stored !== null) {
        setDeepLink(stored);
        setEnableDeepLink(!!stored);
      }
    }
  }, [open, appId]);

  useEffect(() => {
    if (isDeepLinkValid) {
      safeStorage.set(deepLinkStorageKey(appId), normalizedDeepLink);
    }
  }, [appId, isDeepLinkValid, normalizedDeepLink]);

  const codePayload = {
    type: '__rnPushyVersionHash',
    data: hash,
  };
  const codeValue = isDeepLinkValid
    ? `${normalizedDeepLink}?${new URLSearchParams(codePayload).toString()}`
    : JSON.stringify(codePayload);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      maskClosable
      keyboard
      destroyOnClose
      footer={null}
      width={480}
      title={
        <div className="flex items-center justify-between pr-6">
          <span className="font-semibold text-base text-[var(--ant-color-text)]">
            {t('version_table.qr_title')}
          </span>
          <a
            target="_blank"
            className="text-xs text-[var(--ant-color-primary)] hover:underline font-normal"
            href={TEST_QR_CODE_DOC}
            rel="noopener noreferrer"
          >
            {t('version_table.how_to_use')}
          </a>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-[var(--ant-color-border-secondary)]">
          <QRCode
            value={codeValue}
            color="#000000"
            bgColor="#ffffff"
            bordered={false}
            size={180}
          />
        </div>
        {name && (
          <div className="font-medium text-center text-sm text-[var(--ant-color-text)]">
            {name}
          </div>
        )}
        <div className="w-full space-y-3">
          <div className="block text-xs text-center text-[var(--ant-color-text-secondary)]">
            {isDeepLinkValid
              ? t('version_table.qr_pass_hash')
              : enableDeepLink
                ? t('version_table.qr_deep_link_invalid')
                : t('version_table.qr_no_deep_link')}
          </div>
          <Input.TextArea
            readOnly
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={codeValue}
            className="font-mono text-xs"
          />
          <div className="flex flex-col gap-2 rounded bg-[var(--ant-color-fill-quaternary)] border border-[var(--ant-color-border-secondary)] p-3">
            <Checkbox
              checked={enableDeepLink}
              onChange={({ target }) => {
                setEnableDeepLink(target.checked);
              }}
            >
              <span className="text-sm font-medium text-[var(--ant-color-text)]">
                {t('version_table.use_deep_link')}
              </span>
            </Checkbox>
            {enableDeepLink ? (
              <div className="space-y-1 mt-1">
                <div className="text-xs text-[var(--ant-color-text-secondary)]">
                  {t('version_table.deep_link_hint')}
                </div>
                <Input
                  allowClear
                  placeholder={`${DEEP_LINK_EXAMPLE}`}
                  status={deepLinkError ? 'error' : undefined}
                  value={deepLink}
                  onBlur={() => {
                    setDeepLink(normalizedDeepLink);
                  }}
                  onChange={({ target }) => {
                    setDeepLink(target.value);
                  }}
                />
                {deepLinkError ? (
                  <div className="text-xs text-[var(--ant-color-error)]">
                    {deepLinkError}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--ant-color-text-secondary)]">
                    {t('version_table.deep_link_example', {
                      link: normalizedDeepLink,
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const removeVersion = (
  record: Version,
  appId: number,
  deleteVersions: (variables: {
    appId: number;
    versionIds: number[];
  }) => Promise<unknown>,
  t: (key: string, opts?: Record<string, unknown>) => string,
) => {
  Modal.confirm({
    title: t('version_table.delete_title'),
    content: record.name,
    maskClosable: true,
    keyboard: true,
    okButtonProps: { danger: true },
    async onOk() {
      await deleteVersions({ appId, versionIds: [record.id] });
    },
  });
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

  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: (
        <span className="font-semibold text-xs text-[var(--ant-color-text)] max-w-[240px] truncate block">
          {record.name}
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
    {
      key: 'qr',
      icon: <QrcodeOutlined />,
      label: t('version_table.qr_title'),
    },
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

  return (
    <div className="w-full">
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === 'delete') {
              removeVersion(record, appId, deleteVersions.mutateAsync, t);
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

function removeSelectedVersions({
  selected,
  versions,
  appId,
  deleteVersions,
  t,
}: {
  selected: number[];
  versions: Version[];
  appId: number;
  deleteVersions: (vars: {
    appId: number;
    versionIds: number[];
  }) => Promise<unknown>;
  t: (key: string) => string;
}) {
  const versionNames: string[] = [];
  for (const v of versions) {
    if (selected.includes(v.id)) {
      versionNames.push(v.name);
    }
  }
  Modal.confirm({
    title: t('version_table.delete_title'),
    content: (
      <div className="max-h-48 overflow-y-auto">
        {versionNames.map((name) => (
          <div key={name}>{name}</div>
        ))}
      </div>
    ),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await deleteVersions({ appId, versionIds: selected });
    },
  });
}

interface ResizableHeaderCellProps extends ComponentProps<'th'> {
  width?: number;
  minWidth?: number;
  onResize?: (width: number) => void;
}

const ResizableHeaderCell = ({
  width,
  minWidth = 100,
  onResize,
  children,
  className,
  ...restProps
}: ResizableHeaderCellProps) => {
  const [isResizing, setIsResizing] = useState(false);

  if (!width || !onResize) {
    return (
      <th className={className} {...restProps}>
        {children}
      </th>
    );
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(minWidth, startWidth + deltaX);
      onResize(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      className={`relative select-none ${className || ''}`}
      style={{ width }}
      {...restProps}
    >
      {children}
      <span
        role="slider"
        aria-orientation="vertical"
        aria-label="Resize column"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={1000}
        tabIndex={0}
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-[var(--ant-color-primary)] active:bg-[var(--ant-color-primary)] transition-colors ${
          isResizing ? 'bg-[var(--ant-color-primary)]' : ''
        }`}
        onMouseDown={handleMouseDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            onResize(Math.max(minWidth, width - 10));
          } else if (e.key === 'ArrowRight') {
            onResize(width + 10);
          }
        }}
      />
    </th>
  );
};

const DEFAULT_COLUMN_WIDTHS = {
  name: 160,
  description: 220,
  metaInfo: 140,
  createdAt: 160,
};

type ResizableColumnKey = keyof typeof DEFAULT_COLUMN_WIDTHS;

const getStoredWidth = (key: ResizableColumnKey) => {
  const val = Number(safeStorage.get(`version_table_col_w_${key}`));
  return val > 0 ? val : DEFAULT_COLUMN_WIDTHS[key];
};

function getColumns(
  t: (key: string) => string,
  canPublish: boolean,
  widths: typeof DEFAULT_COLUMN_WIDTHS,
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

type EditableVersionKey = 'name' | 'description' | 'metaInfo' | 'createdAt';

const EditFieldModal = ({
  title,
  isJson,
  initialValue,
  saving,
  onSubmit,
  onClose,
}: {
  title: ReactNode;
  isJson: boolean;
  initialValue: string;
  saving: boolean;
  onSubmit: (value: string) => Promise<unknown>;
  onClose: () => void;
}) => {
  const [textValue, setTextValue] = useState(initialValue);
  // vanilla-jsoneditor replays the `content` prop on every re-render, so the
  // JSON draft lives in a ref to keep the editor uncontrolled while typing.
  const jsonDraftRef = useRef(initialValue);
  const [initialContent] = useState(() => ({ text: initialValue }));

  return (
    <Modal
      open
      title={title}
      width={isJson ? 640 : undefined}
      maskClosable
      confirmLoading={saving}
      onCancel={onClose}
      onOk={async () => {
        try {
          await onSubmit(isJson ? jsonDraftRef.current : textValue);
        } catch {
          // request layer already toasts the error; keep the modal open
          return;
        }
        onClose();
      }}
    >
      {isJson ? (
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center">
              <Spin />
            </div>
          }
        >
          <JsonEditor
            className="h-96"
            content={initialContent}
            onChange={(content) => {
              jsonDraftRef.current = (content as TextContent).text;
            }}
          />
        </Suspense>
      ) : (
        <Input.TextArea
          value={textValue}
          onChange={({ target }) => setTextValue(target.value)}
        />
      )}
    </Modal>
  );
};

const formatMetadata = (val: string | null | undefined) => {
  if (!val) return '';
  try {
    const parsed = JSON.parse(val);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return val;
  }
};

const TextColumn = ({
  record,
  recordKey,
  title,
  isEditable = true,
  canPublish,
  extra,
  className,
  showPopover = false,
}: {
  record: Version;
  recordKey: EditableVersionKey;
  title?: ReactNode;
  isEditable?: boolean;
  /** 由表格层查一次权限后传下来，避免每个单元格各挂一个 query observer */
  canPublish: boolean;
  extra?: ReactNode;
  className?: string;
  showPopover?: boolean;
}) => {
  const key = recordKey;
  const { appId } = useManageContext();
  const updateVersion = useUpdateVersion();
  const [editing, setEditing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { t } = useTranslation();
  // 只读角色隐藏所有编辑入口
  isEditable = isEditable && canPublish;
  let value = record[key] as string;
  if (key === 'createdAt') {
    value = dayjs(value).format('YYYY-MM-DD HH:mm');
  }

  const popoverContent = (
    <div className="flex flex-col gap-2 text-[var(--ant-color-text)]">
      {isEditable && (
        <div className="flex items-center justify-between border-b border-[var(--ant-color-border-secondary)] pb-1 mb-1">
          <span className="font-medium text-xs text-[var(--ant-color-text-secondary)]">
            {title}
          </span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setPopoverOpen(false);
              setEditing(true);
            }}
            className="p-0 h-auto text-xs text-[var(--ant-color-text)] hover:text-[var(--ant-color-primary)] flex items-center gap-1"
          >
            {t('common.edit')}
          </Button>
        </div>
      )}
      <div
        style={{ maxWidth: '400px', maxHeight: '250px', overflow: 'auto' }}
        className="whitespace-pre-wrap break-all text-sm text-[var(--ant-color-text)]"
      >
        {key === 'metaInfo' ? (
          <pre className="font-mono text-xs bg-[var(--ant-color-fill-quaternary)] text-[var(--ant-color-text)] p-2 rounded m-0 border border-[var(--ant-color-border-secondary)]">
            {formatMetadata(value)}
          </pre>
        ) : (
          value || (
            <span className="text-[var(--ant-color-text-tertiary)] italic">
              {t('common.none')}
            </span>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {showPopover ? (
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => setPopoverOpen(open)}
          content={popoverContent}
          title={null}
          trigger="hover"
          placement="topLeft"
          overlayStyle={{ maxWidth: '420px' }}
        >
          <div className="w-full cursor-pointer py-1 px-1.5 -mx-1.5 rounded hover:bg-[var(--ant-color-fill-secondary)] transition-colors">
            <Typography.Text
              className={
                className ||
                'block max-w-[9rem] md:w-40 text-[var(--ant-color-text)]'
              }
              ellipsis
            >
              {value || (
                <span className="text-[var(--ant-color-text-tertiary)] italic">
                  -
                </span>
              )}
            </Typography.Text>
          </div>
        </Popover>
      ) : (
        <div className="py-1 px-1.5 -mx-1.5">
          <Typography.Text
            className={
              className ||
              'block max-w-[9rem] md:w-40 text-[var(--ant-color-text)]'
            }
            editable={
              isEditable
                ? { editing: false, onStart: () => setEditing(true) }
                : undefined
            }
            ellipsis
          >
            {value}
          </Typography.Text>
        </div>
      )}
      {extra}
      {editing && (
        <EditFieldModal
          title={title}
          isJson={key === 'metaInfo'}
          initialValue={value ?? ''}
          saving={updateVersion.isPending}
          onClose={() => setEditing(false)}
          onSubmit={(newValue) =>
            updateVersion.mutateAsync({
              appId,
              versionId: record.id,
              params: { [key]: newValue } as Partial<
                Omit<Version, 'id' | 'packages'>
              >,
            })
          }
        />
      )}
    </div>
  );
};
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
        safeStorage.set(`version_table_col_w_${key}`, String(newWidth));
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
                  removeSelectedVersions({
                    selected,
                    versions,
                    appId,
                    deleteVersions: deleteVersions.mutateAsync,
                    t,
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
