import { LinkOutlined, QrcodeOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Input,
  Menu,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
  QRCode,
  Popover,
  Checkbox,
} from 'antd';
import { ColumnType } from 'antd/lib/table';
import { observable, runInAction } from 'mobx';
import { observer, Observer } from 'mobx-react-lite';
// import { useDrag, useDrop } from "react-dnd";
import { ReactNode, useEffect, useState } from 'react';
import request from '../../request';
import state, { bindPackage, fetchVersions, removeSelectedVersions } from './state';

const TestQrCode = ({ name, hash }: { name: string; hash: string }) => {
  const [deepLink, setDeepLink] = useState(
    window.localStorage.getItem(`${state.app?.id}_deeplink`) ?? ''
  );
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);

  const isDeepLinkValid = enableDeepLink && deepLink.endsWith('://');

  useEffect(() => {
    if (isDeepLinkValid) {
      window.localStorage.setItem(`${state.app?.id}_deeplink`, deepLink);
    }
  }, [deepLink, isDeepLinkValid]);

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
          <div style={{ textAlign: 'center', margin: '5px auto' }}>测试二维码</div>
          <QRCode value={codeValue} bordered={false} style={{ margin: '0 auto' }} />
          <div style={{ textAlign: 'center', margin: '5px auto' }}>{name}</div>
          {/* <div style={{ textAlign: 'center', margin: '0 auto' }}>{hash}</div> */}
          <div>
            <Input.TextArea readOnly autoSize value={codeValue} style={{ marginBottom: '5px' }} />
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

const columns: ColumnType<Version>[] = [
  {
    title: '版本',
    dataIndex: 'name',
    render: (_, record) =>
      renderTextCol({
        record,
        key: 'name',
        extra: <TestQrCode name={record.name} hash={record.hash} />,
      }),
  },
  {
    title: '描述',
    dataIndex: 'description',
    render: (_, record) => renderTextCol({ record, key: 'description' }),
  },
  {
    title: '元信息',
    dataIndex: 'metaInfo',
    render: (_, record) => renderTextCol({ record, key: 'metaInfo' }),
  },
  {
    title: '绑定原生包',
    dataIndex: 'packages',
    width: '100%',
    render: (_, { packages, id }) => (
      <Observer>
        {() => {
          const bindedPackages = packages.map((i) => <PackageItem key={i.id} item={i} />);
          const items = state.packages.filter((i) => !packages.some((j) => i.id === j.id));
          if (items.length === 0) return bindedPackages;

          const menu = (
            <Menu>
              {items.map((i) => (
                <Menu.Item key={i.id} onClick={() => bindPackage(i.id, id)}>
                  {i.name}
                </Menu.Item>
              ))}
            </Menu>
          );
          return (
            <>
              {bindedPackages}
              <Dropdown
                className='ant-typography-edit'
                overlay={menu}
                getPopupContainer={() =>
                  document.querySelector(`[data-row-key="${id}"]`) ?? document.body
                }
              >
                <Button type='link' size='small' icon={<LinkOutlined />}>
                  绑定
                </Button>
              </Dropdown>
            </>
          );
        }}
      </Observer>
    ),
  },
  {
    title: '上传时间',
    dataIndex: 'createdAt',
    render: (_, record) => renderTextCol({ record, key: 'createdAt', isEditable: false }),
  },
];

function renderTextCol({
  record,
  key,
  isEditable = true,
  extra,
}: {
  record: Version;
  key: string;
  isEditable?: boolean;
  extra?: ReactNode;
}) {
  let value = Reflect.get(record, key);
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
          title: columns.find((i) => i.dataIndex === key)?.title as string,
          closable: true,
          maskClosable: true,
          content: (
            <Input.TextArea
              defaultValue={value}
              onChange={({ target }) => (value = target.value)}
            />
          ),
          async onOk() {
            await request('put', `app/${state.app?.id}/version/${record.id}`, { [key]: value });
            fetchVersions(state.pagination.current);
          },
        });
      },
    };
  }
  return (
    <div>
      <Typography.Text style={{ width: 160 }} editable={editable} ellipsis>
        {value}
      </Typography.Text>
      {extra}
    </div>
  );
}

export default observer(() => {
  const { versions, pagination, loading, selected } = state;

  return (
    <Table
      className='versions'
      rowKey='id'
      title={() => '热更新包'}
      columns={columns}
      components={{ body: { row: TableRow } }}
      dataSource={versions}
      pagination={pagination}
      rowSelection={{
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        onChange: (keys) =>
          runInAction(() => (state.selected = observable.array(keys as number[]))),
      }}
      loading={loading}
      footer={
        selected.length
          ? () => (
              <Button onClick={removeSelectedVersions} danger>
                删除
              </Button>
            )
          : undefined
      }
    />
  );
});

const TableRow = (props: any) => {
  // const [{ canDrop, isOver }, drop] = useDrop(() => ({
  //   accept: "package",
  //   async drop(pack: PackageBase) {
  //     const { id, packages = [] } = state.versions.find((i) => i.id == props["data-row-key"]) ?? {};
  //     if (!packages.some(({ id }) => pack.id == id)) {
  //       bindPackage(pack.id, id!);
  //     }
  //   },
  //   collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  // }));
  const className = '';
  // if (canDrop) className = "can-drop";
  // if (isOver) className = "is-over";
  return (
    <tr
      // ref={drop}
      {...props}
      className={`ant-table-row ${className}`}
    />
  );
};

const PackageItem = ({ item }: { item: PackageBase }) => (
  // const [_, drag] = useDrag(() => ({ item, type: "package" }));
  <Tooltip title={item.note}>
    <Tag color='#1890ff'>{item.name}</Tag>
  </Tooltip>
);
