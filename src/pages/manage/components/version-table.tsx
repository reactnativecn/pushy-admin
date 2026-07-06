import {
  EditOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Grid,
  Input,
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
  lazy,
  type ReactNode,
  Suspense,
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
import { useVersions } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import BindPackage from './bind-package';
import { Commit } from './commit';
import { DepsTable } from './deps-table';
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

const TestQrCode = ({ name, hash }: { name?: string; hash: string }) => {
  const { t } = useTranslation();
  const { appId, deepLink, setDeepLink } = useManageContext();
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);
  const normalizedDeepLink = deepLink.trim();
  const deepLinkError = enableDeepLink
    ? getDeepLinkError(normalizedDeepLink, t)
    : '';

  const isDeepLinkValid = enableDeepLink && !deepLinkError;

  useEffect(() => {
    if (isDeepLinkValid) {
      window.localStorage.setItem(`${appId}_deeplink`, normalizedDeepLink);
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
    <Popover
      className="ant-typography-edit"
      content={
        <div className="w-72 sm:w-80">
          <div className="text-center my-2 mx-auto">
            {t('version_table.qr_title')} <br />
            <a
              target="_blank"
              className="ml-1 text-xs"
              href={TEST_QR_CODE_DOC}
              rel="noopener noreferrer"
            >
              {t('version_table.how_to_use')}
            </a>
          </div>
          <div className="flex justify-center">
            <QRCode value={codeValue} bordered={false} />
          </div>
          <div className="text-center my-2 mx-auto">{name}</div>
          {/* <div style={{ textAlign: 'center', margin: '0 auto' }}>{hash}</div> */}
          <div className="space-y-2">
            <Typography.Text type="secondary" className="block text-xs">
              {isDeepLinkValid
                ? t('version_table.qr_pass_hash')
                : enableDeepLink
                  ? t('version_table.qr_deep_link_invalid')
                  : t('version_table.qr_no_deep_link')}
            </Typography.Text>
            <Input.TextArea
              readOnly
              autoSize
              value={codeValue}
              className="mb-2!"
            />
            <div className="flex flex-col gap-2">
              <Checkbox
                checked={enableDeepLink}
                onChange={({ target }) => {
                  setEnableDeepLink(target.checked);
                }}
              >
                {t('version_table.use_deep_link')}
              </Checkbox>
              {enableDeepLink ? (
                <div className="space-y-1">
                  <Typography.Text type="secondary" className="block text-xs">
                    {t('version_table.deep_link_hint')}
                  </Typography.Text>
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
                    <Typography.Text type="danger" className="block text-xs">
                      {deepLinkError}
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary" className="block text-xs">
                      {t('version_table.deep_link_example', {
                        link: normalizedDeepLink,
                      })}
                    </Typography.Text>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      }
    >
      <Button type="link" icon={<QrcodeOutlined />} onClick={() => {}} />
    </Popover>
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
  deleteVersions: (variables: {
    appId: number;
    versionIds: number[];
  }) => Promise<unknown>;
  t: (key: string) => string;
}) {
  const versionNames: string[] = [];
  const selectedSet = new Set(selected);
  for (const v of versions) {
    if (selectedSet.has(v.id)) {
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

function getColumns(t: (key: string) => string): ColumnType<Version>[] {
  return [
    {
      title: t('version_table.col_version'),
      dataIndex: 'name',
      render: (_, record) => (
        <TextColumn
          record={record}
          recordKey="name"
          title={t('version_table.col_version')}
          extra={
            <>
              <DepsTable
                deps={record.deps}
                name={`${t('version_table.title')} ${record.name}`}
              />
              <Commit commit={record.commit} />
              <TestQrCode name={record.name} hash={record.hash} />
            </>
          }
        />
      ),
    },
    {
      title: t('version_table.col_description'),
      dataIndex: 'description',
      responsive: ['md'],
      width: 250,
      render: (_, record) => (
        <TextColumn
          record={record}
          recordKey="description"
          title={t('version_table.col_description')}
          className="block max-w-[15rem] md:w-60"
          showPopover
        />
      ),
    },
    {
      title: t('version_table.col_metadata'),
      dataIndex: 'metaInfo',
      responsive: ['lg'],
      width: 300,
      render: (_, record) => (
        <TextColumn
          record={record}
          recordKey="metaInfo"
          title={t('version_table.col_metadata')}
          className="block max-w-[18rem] md:w-72"
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
      width: '100%',
      render: (_, { id, config, deps, name }) => (
        <BindPackage
          config={config}
          versionId={id}
          versionDeps={deps}
          versionName={name}
        />
      ),
    },
    {
      title: t('version_table.col_uploaded'),
      dataIndex: 'createdAt',
      responsive: ['md'],
      render: (_, record) => (
        <TextColumn record={record} recordKey="createdAt" isEditable={false} />
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
  extra,
  className,
  showPopover = false,
}: {
  record: Version;
  recordKey: EditableVersionKey;
  title?: ReactNode;
  isEditable?: boolean;
  extra?: ReactNode;
  className?: string;
  showPopover?: boolean;
}) => {
  const key = recordKey;
  const { appId } = useManageContext();
  const updateVersion = useUpdateVersion();
  const [editing, setEditing] = useState(false);
  const { t } = useTranslation();
  let value = record[key] as string;
  if (key === 'createdAt') {
    value = dayjs(value).format('YYYY-MM-DD HH:mm');
  }

  const popoverContent = (
    <div className="flex flex-col gap-2">
      {isEditable && (
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1 mb-1">
          <span className="font-medium text-xs text-gray-400">{title}</span>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditing(true)}
            className="p-0 h-auto text-xs"
          >
            {t('common.edit')}
          </Button>
        </div>
      )}
      <div
        style={{ maxWidth: '400px', maxHeight: '250px', overflow: 'auto' }}
        className="whitespace-pre-wrap break-all text-sm"
      >
        {key === 'metaInfo' ? (
          <pre className="font-mono text-xs bg-gray-50 dark:bg-gray-900/50 p-2 rounded m-0 border border-gray-100 dark:border-gray-800">
            {formatMetadata(value)}
          </pre>
        ) : (
          value || (
            <span className="text-gray-400 italic">
              {t('common.none') || '无'}
            </span>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="group flex items-center justify-between gap-1">
      {showPopover ? (
        <Popover
          content={popoverContent}
          title={null}
          trigger="hover"
          placement="topLeft"
          overlayStyle={{ maxWidth: '420px' }}
        >
          <Typography.Text
            className={className || 'block max-w-[9rem] md:w-40'}
            ellipsis
          >
            {value || <span className="text-gray-400 italic">-</span>}
          </Typography.Text>
        </Popover>
      ) : (
        <Typography.Text
          className={className || 'block max-w-[9rem] md:w-40'}
          editable={
            isEditable
              ? { editing: false, onStart: () => setEditing(true) }
              : undefined
          }
          ellipsis
        >
          {value}
        </Typography.Text>
      )}
      {extra}
      {showPopover && isEditable && (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0 h-auto shrink-0"
        />
      )}
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
  const columns = useMemo(() => getColumns(t), [t]);
  const deleteVersions = useDeleteVersions();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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
        showSizeChanger: !isMobile,
        simple: isMobile,
        total: count,
        current: offset / pageSize + 1,
        pageSize,
        showTotal: isMobile
          ? undefined
          : (total) => t('version_table.total_versions', { total }),
        onChange(page, size) {
          if (size) {
            setOffset((page - 1) * size);
            setPageSize(size);
          }
        },
      }}
      scroll={{ x: 960 }}
      rowSelection={{
        selections: isMobile
          ? undefined
          : [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        onChange: (keys) => setSelected(keys as number[]),
      }}
      loading={isLoading}
      footer={
        selected.length
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
