import { InfoCircleOutlined, QrcodeOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Grid,
  Input,
  Modal,
  Popover,
  QRCode,
  Table,
  Typography,
} from 'antd';
import type { ColumnType } from 'antd/lib/table';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextContent } from 'vanilla-jsoneditor';
import { TEST_QR_CODE_DOC } from '@/constants/links';
import { api } from '@/services/api';
import { useVersions } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import BindPackage from './bind-package';
import { Commit } from './commit';
import { DepsTable } from './deps-table';
import JsonEditor from './json-editor';
import PublishFeatureTable from './publish-feature-table';

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
  t,
}: {
  selected: number[];
  versions: Version[];
  appId: number;
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
      await api.deleteVersions({ appId, versionIds: selected });
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
      render: (_, record) => (
        <TextColumn record={record} recordKey="description" />
      ),
    },
    {
      title: t('version_table.col_metadata'),
      dataIndex: 'metaInfo',
      responsive: ['lg'],
      render: (_, record) => (
        <TextColumn record={record} recordKey="metaInfo" />
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

const TextColumn = ({
  record,
  recordKey,
  isEditable = true,
  extra,
}: {
  record: Version;
  recordKey: string;
  isEditable?: boolean;
  extra?: ReactNode;
}) => {
  const { t } = useTranslation();
  const columns = getColumns(t);
  const key = recordKey;
  const { appId } = useManageContext();
  let value = record[key as keyof Version] as string;
  if (key === 'createdAt') {
    const t = new Date(value);
    const y = t.getFullYear();
    const month = t.getMonth() + 1;
    const M = month < 10 ? `0${month}` : month;
    const d = t.getDate() < 10 ? `0${t.getDate()}` : t.getDate();
    const h = t.getHours() < 10 ? `0${t.getHours()}` : t.getHours();
    const m = t.getMinutes() < 10 ? `0${t.getMinutes()}` : t.getMinutes();
    value = `${y}-${M}-${d} ${h}:${m}`;
  }
  let editable: any = null;
  if (isEditable) {
    editable = {
      editing: false,
      onStart() {
        let originValue = value;
        Modal.confirm({
          icon: null,
          width: key === 'metaInfo' ? 640 : undefined,
          title: columns.find((i) => i.dataIndex === key)?.title as string,
          closable: true,
          maskClosable: true,
          content:
            key === 'metaInfo' ? (
              <JsonEditor
                className="h-96"
                content={{ text: value ?? '' }}
                onChange={(content) => {
                  value = (content as TextContent).text;
                }}
              />
            ) : (
              <Input.TextArea
                defaultValue={value}
                onChange={({ target }) => {
                  value = target.value;
                }}
              />
            ),
          async onOk() {
            originValue = value;
            await api.updateVersion({
              appId,
              versionId: record.id,
              params: { [key]: value } as unknown as Omit<
                Version,
                'id' | 'packages'
              >,
            });
          },
          async onCancel() {
            value = originValue;
          },
        });
      },
    };
  }
  return (
    <div>
      <Typography.Text
        className="block max-w-[9rem] md:w-40"
        editable={editable}
        ellipsis
      >
        {value}
      </Typography.Text>
      {extra}
    </div>
  );
};
export default function VersionTable() {
  const { t } = useTranslation();
  const columns = getColumns(t);
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
            bordered={false}
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
                  removeSelectedVersions({ selected, versions, appId, t })
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
