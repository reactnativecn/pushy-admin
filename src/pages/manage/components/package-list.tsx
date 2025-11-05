// import { useDrag } from "react-dnd";

import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';
import { Commit } from './commit';
import { DepsTable } from './deps-table';

const PackageList = ({
  dataSource,
  loading,
}: {
  dataSource?: Package[];
  loading?: boolean;
}) => (
  <List
    loading={loading}
    className="packages"
    size="small"
    dataSource={dataSource}
    renderItem={(item) => <Item item={item} />}
  />
);
export default PackageList;

function remove(item: Package, appId: number) {
  Modal.confirm({
    title: `删除后无法恢复，确定删除原生包“${item.name}”？`,
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await api.deletePackage({ appId, packageId: item.id });
    },
  });
}

function edit(item: Package, appId: number) {
  let { note, status } = item;
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form layout="vertical" initialValues={item}>
        <Form.Item name="note" label="备注">
          <Input
            placeholder="添加原生包备注"
            onChange={({ target }) => (note = target.value)}
          />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            onSelect={(value: Package['status']) => {
              status = value;
            }}
          >
            <Select.Option value="normal">正常</Select.Option>
            <Select.Option value="paused">暂停</Select.Option>
            <Select.Option value="expired">过期</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    async onOk() {
      await api.updatePackage({
        appId,
        packageId: item.id,
        params: { note, status },
      });
    },
  });
}

const Item = ({ item }: { item: Package }) => {
  const { appId } = useManageContext();
  return (
    // const [_, drag] = useDrag(() => ({ item, type: "package" }));
    <div className="bg-white my-0 [&_li]:px-0!">
      <List.Item className="p-2">
        <List.Item.Meta
          title={
            <Row align="middle">
              <Col flex={1}>
                {item.name}
                {item.status && item.status !== 'normal' && (
                  <Tag className="ml-2">{status[item.status]}</Tag>
                )}
              </Col>
              <DepsTable deps={item.deps} name={`原生包 ${item.name}`} />
              <Commit commit={item.commit} />
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => edit(item, appId)}
              />
              <Button
                type="link"
                icon={<DeleteOutlined />}
                onClick={() => remove(item, appId)}
                danger
              />
            </Row>
          }
          description={
            <div>
              {item.note && (
                <Typography.Paragraph
                  className="mb-0"
                  type="secondary"
                  ellipsis={{ tooltip: item.note }}
                >
                  备注：{item.note}
                </Typography.Paragraph>
              )}
              <div className="text-xs flex flex-col gap-1">
                <div>编译时间：{item.buildTime}</div>
              </div>
            </div>
          }
        />
      </List.Item>
    </div>
  );
};
const status = {
  paused: '暂停',
  expired: '过期',
};
