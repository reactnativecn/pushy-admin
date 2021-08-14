import {
  AndroidFilled,
  AppleFilled,
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import request from "../../request";
import state, { fetchApps } from "./state";

export default observer(() => {
  useEffect(fetchApps, []);
  const { loading, apps } = state;
  if (loading && !apps.length) return <Spin />;

  return (
    <Row gutter={16}>
      <Col style={style.card}>
        <Card style={style.add} onClick={add}>
          <PlusOutlined /> 添加应用
        </Card>
      </Col>
      {apps.map((item) => (
        <Col style={style.card}>
          <Card
            bordered={false}
            onClick={({ target }) => console.log(target)}
            actions={[
              <SettingOutlined onClick={() => console.log(0)} />,
              <Popconfirm
                title="应用删除后将无法恢复"
                okText="确认删除"
                onConfirm={() => remove(item)}
              >
                <DeleteOutlined style={style.remove} />
              </Popconfirm>,
            ]}
          >
            <Link className="ant-typography" to={`/apps/${item.id}`}>
              <Space style={style.title}>
                {item.platform == "ios" ? (
                  <AppleFilled style={style.ios} />
                ) : (
                  <AndroidFilled style={style.android} />
                )}
                <Typography.Text style={{ width: 176 }} ellipsis>
                  {item.name}
                </Typography.Text>
              </Space>
            </Link>
          </Card>
        </Col>
      ))}
    </Row>
  );
});

function add() {
  let name = "";
  let platform = "android";
  Modal.confirm({
    icon: null,
    content: (
      <Form initialValues={{ platform }} onFinish={() => console.log(0)}>
        <Form.Item label="应用名称" name="name">
          <Input placeholder="请输入应用名称" onChange={({ target }) => (name = target.value)} />
        </Form.Item>
        <Form.Item label="选择平台" name="platform">
          <Select
            // @ts-ignore
            onSelect={(value) => (platform = value)}
          >
            <Select.Option value="android">
              <AndroidFilled style={style.android} /> Android
            </Select.Option>
            <Select.Option value="ios">
              <AppleFilled style={style.ios} /> iOS
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    onOk: (_) => {
      if (!name) {
        message.warn("请输入应用名称");
        return false;
      }
      return request("post", "app/create", { name, platform })
        .then(fetchApps)
        .catch((error) => {
          message.error(error.message);
        });
    },
  });
}

async function remove(app: App) {
  await request("delete", `app/${app.id}`);
  fetchApps();
}

const style: Style = {
  add: { textAlign: "center", lineHeight: "72px", height: "100%", cursor: "pointer" },
  card: { width: 240, marginBottom: 16 },
  remove: { color: "#ff4d4f" },
  title: { fontSize: 16 },
  ios: { color: "#a6b1b7", fontSize: "120%" },
  android: { color: "#3ddc84", fontSize: "120%" },
};
