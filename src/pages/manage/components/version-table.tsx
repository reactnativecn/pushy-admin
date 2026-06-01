import { InfoCircleOutlined, QrcodeOutlined } from '@ant-design/icons';
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
import { type ReactNode, useEffect, useState } from 'react';
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

function getDeepLinkError(deepLink: string) {
  if (!deepLink) {
    return '请输入 App 已注册的 URL Scheme，例如 pushy://';
  }
  if (/^https?:\/\//i.test(deepLink)) {
    return '这里不是网页地址，请填写 App 的自定义 Scheme，例如 pushy://';
  }
  if (/[?#]/.test(deepLink) || !deepLink.endsWith('://')) {
    return '这里只填写 Scheme 前缀，格式为 scheme://，不要带路径、参数或版本信息';
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\/$/i.test(deepLink)) {
    return 'Scheme 需以字母开头，只能包含字母、数字、+、-、.';
  }
  return '';
}

const TestQrCode = ({ name, hash }: { name?: string; hash: string }) => {
  const { appId, deepLink, setDeepLink } = useManageContext();
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);
  const normalizedDeepLink = deepLink.trim();
  const deepLinkError = enableDeepLink
    ? getDeepLinkError(normalizedDeepLink)
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
            测试二维码 <br />
            <a
              target="_blank"
              className="ml-1 text-xs"
              href={TEST_QR_CODE_DOC}
              rel="noopener noreferrer"
            >
              如何使用？
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
                ? '二维码会拉起 App 并传入热更包 Hash'
                : enableDeepLink
                  ? 'Deep Link 格式未通过，当前二维码仍为普通 JSON'
                  : '未使用 Deep Link 时，二维码内容为普通 JSON'}
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
                用 Deep Link 打开 App
              </Checkbox>
              {enableDeepLink ? (
                <div className="space-y-1">
                  <Typography.Text type="secondary" className="block text-xs">
                    填 App 原生注册的 URL Scheme，只填前缀，不填路径或参数。
                  </Typography.Text>
                  <Input
                    allowClear
                    placeholder={`例如 ${DEEP_LINK_EXAMPLE}`}
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
                      生成示例：{normalizedDeepLink}?type=...
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
}: {
  selected: number[];
  versions: Version[];
  appId: number;
}) {
  const versionNames: string[] = [];
  const selectedSet = new Set(selected);
  for (const v of versions) {
    if (selectedSet.has(v.id)) {
      versionNames.push(v.name);
    }
  }
  Modal.confirm({
    title: '删除所选热更包：',
    content: versionNames.join('，'),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await api.deleteVersions({ appId, versionIds: selected });
    },
  });
}

const columns: ColumnType<Version>[] = [
  {
    title: '版本',
    dataIndex: 'name',
    render: (_, record) => (
      <TextColumn
        record={record}
        recordKey="name"
        extra={
          <>
            <DepsTable deps={record.deps} name={`热更包 ${record.name}`} />
            <Commit commit={record.commit} />
            <TestQrCode name={record.name} hash={record.hash} />
          </>
        }
      />
    ),
  },
  {
    title: '描述',
    dataIndex: 'description',
    responsive: ['md'],
    render: (_, record) => (
      <TextColumn record={record} recordKey="description" />
    ),
  },
  {
    title: '自定义元信息',
    dataIndex: 'metaInfo',
    responsive: ['lg'],
    render: (_, record) => <TextColumn record={record} recordKey="metaInfo" />,
  },
  {
    title: (
      <Popover content={<PublishFeatureTable />}>
        发布到原生包
        <span className="text-amber-600">
          (<InfoCircleOutlined />
          功能说明)
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
    title: '上传时间',
    dataIndex: 'createdAt',
    responsive: ['md'],
    render: (_, record) => (
      <TextColumn record={record} recordKey="createdAt" isEditable={false} />
    ),
  },
];

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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { appId } = useManageContext();
  const [selected, setSelected] = useState<number[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const { versions, count, isLoading } = useVersions({
    appId,
    offset,
    limit: pageSize,
  });

  return (
    <Table
      className="versions"
      rowKey="id"
      title={() => '热更包'}
      columns={columns}
      dataSource={versions}
      size={isMobile ? 'small' : 'middle'}
      pagination={{
        showSizeChanger: !isMobile,
        simple: isMobile,
        total: count,
        current: offset / pageSize + 1,
        pageSize,
        showTotal: isMobile ? undefined : (total) => `共 ${total} 个 `,
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
                  removeSelectedVersions({ selected, versions, appId })
                }
                danger
              >
                删除
              </Button>
            )
          : undefined
      }
    />
  );
}
