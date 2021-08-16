import {
  AndroidFilled,
  AppleFilled,
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Card, Col, Popconfirm, Row, Spin, Typography } from "antd";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import request from "../../request";
import add from "./add";
import "./index.css";
import setting from "./setting";
import state, { init } from "./state";

export default observer(() => {
  useEffect(init, []);
  const { loading, apps } = state;
  if (loading && !apps.length) return <Spin />;

  return (
    <Row gutter={16}>
      <Col className="apps-item">
        <Card style={{ cursor: "pointer" }} onClick={add}>
          <Row justify="center" align="middle" gutter={8} style={{ height: 120 }}>
            <PlusOutlined style={{ fontSize: "120%" }} />
            <Col>添加应用</Col>
          </Row>
        </Card>
      </Col>
      {apps.map((item) => (
        <Col className="apps-item">
          <Card
            bordered={false}
            actions={[
              <SettingOutlined onClick={() => setting(item)} />,
              <Popconfirm
                title="应用删除后将无法恢复"
                okText="确认删除"
                onConfirm={() => remove(item)}
              >
                <DeleteOutlined style={{ color: "#ff4d4f" }} />
              </Popconfirm>,
            ]}
          >
            <Link className="ant-typography" to={`/apps/${item.id}`}>
              <Row style={style.title} justify="center" align="middle" gutter={8} wrap={false}>
                {item.platform == "ios" ? (
                  <AppleFilled style={style.ios} />
                ) : (
                  <AndroidFilled style={style.android} />
                )}
                <Typography.Text style={style.name} ellipsis>
                  {item.name}
                </Typography.Text>
              </Row>
            </Link>
          </Card>
        </Col>
      ))}
    </Row>
  );
});

async function remove(app: App) {
  await request("delete", `app/${app.id}`);
  init();
}

export const style: Style = {
  title: { fontSize: 16, height: 72 },
  ios: { color: "#a6b1b7", fontSize: "120%" },
  android: { color: "#3ddc84", fontSize: "120%" },
  name: { maxWidth: "calc(100% - 20px)", flex: 1, marginLeft: 8 },
};
