/* eslint-disable react/no-unstable-nested-components */
import { InfoCircleOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Table, Typography, QRCode, Popover, Checkbox } from 'antd';
import { ColumnType } from 'antd/lib/table';
// import { useDrag, useDrop } from "react-dnd";
import { ReactNode, useEffect, useState } from 'react';
import { TextContent } from 'vanilla-jsoneditor';
import MetaInfoEditor from './metainfo-editor';
import { api } from '@/services/api';
import { useVersions } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import { TEST_QR_CODE_DOC } from '@/constants/links';
import BindPackage from './bind-package';

const TestQrCode = ({ name, hash }: { name: string; hash: string }) => {
  const { appId, deepLink, setDeepLink } = useManageContext();
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);

  const isDeepLinkValid = enableDeepLink && deepLink.endsWith('://');

  useEffect(() => {
    if (isDeepLinkValid) {
      window.localStorage.setItem(`${appId}_deeplink`, deepLink);
    }
  }, [appId, deepLink, isDeepLinkValid]);

  const codePayload = {
    type: '__rnPushyVersionHash',
    data: hash,
  };
  const codeValue = isDeepLinkValid
    ? `${deepLink}?${new URLSearchParams(codePayload).toString()}`
    : JSON.stringify(codePayload);
  return (
    <Popover
      className='ant-typography-edit'
      content={
        <div>
          <div className='text-center my-1 mx-auto'>
            测试二维码 <br />
            <a target='_blank' className='ml-1 text-xs' href={TEST_QR_CODE_DOC} rel='noreferrer'>
              如何使用？
            </a>
          </div>
          <QRCode value={codeValue} bordered={false} className='my-0 mx-auto' />
          <div className='text-center my-0 mx-auto'>{name}</div>
          {/* <div style={{ textAlign: 'center', margin: '0 auto' }}>{hash}</div> */}
          <div>
            <Input.TextArea readOnly autoSize value={codeValue} className='mb-1' />
            <div className='flex flex-row items-center'>
              <Checkbox
                className='mr-4'
                checked={enableDeepLink}
                onChange={({ target }) => {
                  setEnableDeepLink(target.checked);
                }}
              >
                使用 Deep Link：
              </Checkbox>
              <Input
                placeholder='例如 pushy://'
                className='flex-1'
                value={deepLink}
                onChange={({ target }) => {
                  setDeepLink(target.value);
                }}
              />
            </div>
          </div>
        </div>
      }
    >
      <Button type='link' icon={<QrcodeOutlined />} onClick={() => {}} />
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
  versions.forEach((v) => {
    if (selected.includes(v.id)) {
      versionNames.push(v.name);
    }
  });
  Modal.confirm({
    title: '删除所选热更新包：',
    content: versionNames.join('，'),
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await Promise.all(selected.map((id) => api.deleteVersion({ appId, versionId: id })));
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
        recordKey='name'
        extra={<TestQrCode name={record.name} hash={record.hash} />}
      />
    ),
  },
  {
    title: '描述',
    dataIndex: 'description',
    render: (_, record) => <TextColumn record={record} recordKey='description' />,
  },
  {
    title: '自定义元信息',
    dataIndex: 'metaInfo',
    render: (_, record) => <TextColumn record={record} recordKey='metaInfo' />,
  },
  {
    title: (
      <Popover
        content={
          <>
            灰度发布测试中，需要 pushy 版本 v10.15.0 +。
            <br />
            低于此版本的只能全量发布。
            <br />
            取消绑定不会导致已更新的用户回滚。
          </>
        }
      >
        绑定原生包 <InfoCircleOutlined />
      </Popover>
    ),
    dataIndex: 'packages',
    width: '100%',
    render: (_, { packages, id, config }) => (
      <BindPackage config={config} packages={packages} versionId={id} />
    ),
  },
  {
    title: '上传时间',
    dataIndex: 'createdAt',
    render: (_, record) => <TextColumn record={record} recordKey='createdAt' isEditable={false} />,
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
  let editable;
  if (isEditable) {
    editable = {
      editing: false,
      onStart() {
        Modal.confirm({
          icon: null,
          width: key === 'metaInfo' ? 640 : undefined,
          title: columns.find((i) => i.dataIndex === key)?.title as string,
          closable: true,
          maskClosable: true,
          content:
            key === 'metaInfo' ? (
              <MetaInfoEditor
                className='h-96'
                content={{ text: value }}
                onChange={(content) => {
                  value = (content as TextContent).text;
                }}
              />
            ) : (
              <Input.TextArea
                defaultValue={value}
                onChange={({ target }) => (value = target.value)}
              />
            ),
          async onOk() {
            await api.updateVersion({
              appId,
              versionId: record.id,
              params: { [key]: value } as unknown as Omit<Version, 'id' | 'packages'>,
            });
          },
        });
      },
    };
  }
  return (
    <div>
      <Typography.Text className='w-40' editable={editable} ellipsis>
        {value}
      </Typography.Text>
      {extra}
    </div>
  );
};
export default function VersionTable() {
  const { appId } = useManageContext();
  const [selected, setSelected] = useState<number[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const { versions, count, isLoading } = useVersions({ appId, offset, limit: pageSize });

  return (
    <Table
      className='versions'
      rowKey='id'
      title={() => '热更新包'}
      columns={columns}
      dataSource={versions}
      pagination={{
        showSizeChanger: true,
        total: count,
        current: offset / pageSize + 1,
        pageSize,
        showTotal: (total) => `共 ${total} 个 `,
        onChange(page, size) {
          if (size) {
            setOffset((page - 1) * size);
            setPageSize(size);
          }
        },
      }}
      rowSelection={{
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        onChange: (keys) => setSelected(keys as number[]),
      }}
      loading={isLoading}
      footer={
        selected.length
          ? // eslint-disable-next-line react/no-unstable-nested-components
            () => (
              <Button onClick={() => removeSelectedVersions({ selected, versions, appId })} danger>
                删除
              </Button>
            )
          : undefined
      }
    />
  );
}
