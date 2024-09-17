import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, List, Modal, Row, Select, Tag, Typography } from 'antd';
// import { useDrag } from "react-dnd";
import request from '@/services/request';
import state, { fetchPackages, fetchVersions } from './state';

const PackageList = ({ dataSource }: { dataSource?: Package[] }) => (
  <List
    className='packages'
    size='small'
    dataSource={dataSource}
    renderItem={(item) => <Item item={item} />}
  />
);
export default PackageList;

function remove(item: Package) {
  Modal.confirm({
    title: `删除后无法恢复，确定删除原生包“${item.name}”？`,
    maskClosable: true,
    okButtonProps: { danger: true },
    async onOk() {
      await request('delete', `/app/${state.app?.id}/package/${item.id}`);
      fetchPackages();
      fetchVersions(1);
    },
  });
}

function edit(item: Package) {
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form layout='vertical' initialValues={item}>
        <Form.Item name='note' label='备注'>
          <Input
            placeholder='添加原生包备注'
            onChange={({ target }) => (item.note = target.value)}
          />
        </Form.Item>
        <Form.Item name='status' label='状态'>
          <Select
            onSelect={(value) => {
              // @ts-ignore
              item.status = value;
            }}
          >
            <Select.Option value='normal'>正常</Select.Option>
            <Select.Option value='paused'>暂停</Select.Option>
            <Select.Option value='expired'>过期</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    async onOk() {
      const { note, status } = item;
      await request('put', `/app/${state.app?.id}/package/${item.id}`, { note, status });
      fetchPackages();
    },
  });
}

const Item = ({ item }: { item: Package }) => (
  // const [_, drag] = useDrag(() => ({ item, type: "package" }));
  <div style={{ margin: '0 -8px', background: '#fff' }}>
    <List.Item style={{ padding: '8px' }}>
      <List.Item.Meta
        title={
          <Row align='middle'>
            <Col flex={1}>
              {item.name}
              {item.status && item.status !== 'normal' && (
                <Tag style={{ marginLeft: 8 }}>{status[item.status]}</Tag>
              )}
            </Col>
            <Button type='link' icon={<EditOutlined />} onClick={() => edit(item)} />
            <Button type='link' icon={<DeleteOutlined />} onClick={() => remove(item)} danger />
          </Row>
        }
        description={
          <>
            {item.note && (
              <Typography.Paragraph
                style={{ marginBottom: 0 }}
                type='secondary'
                ellipsis={{ tooltip: item.note }}
              >
                备注：{item.note}
              </Typography.Paragraph>
            )}
            编译时间：{item.buildTime}
          </>
        }
      />
    </List.Item>
  </div>
);
const status = {
  paused: '暂停',
  expired: '过期',
};
