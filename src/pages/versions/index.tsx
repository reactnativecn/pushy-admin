import { DeleteFilled, SettingFilled } from "@ant-design/icons";
import { Breadcrumb, Button, Col, Layout, Row, Tabs } from "antd";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./index.css";
import PackageList from "./packages";
import state, { fetch } from "./state";
import VersionTable from "./versions";
import { removeApp } from "../apps/state";
import settingApp from "../apps/setting";

export default observer(() => {
  const id = Reflect.get(useParams(), "id");
  useEffect(() => fetch(id));
  const { app, packages, unused } = state;
  if (app == null) return null;
  return (
    <>
      <Row style={{ marginBottom: 16 }}>
        <Col flex={1}>
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/apps">应用列表</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{app?.name}</Breadcrumb.Item>
          </Breadcrumb>
        </Col>
        <Button.Group>
          <Button
            size="small"
            type="primary"
            icon={<DeleteFilled />}
            onClick={() => removeApp(app)}
            danger
          >
            删除
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<SettingFilled />}
            onClick={() => settingApp(app)}
          >
            设置
          </Button>
        </Button.Group>
      </Row>
      <Layout>
        <Layout.Sider theme="light" style={style.sider} width={240}>
          <div className="ant-table-title" style={style.title}>
            原生包
          </div>
          <Tabs>
            <Tabs.TabPane tab="全部" key="all">
              <PackageList dataSource={packages} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="未使用" key="unused">
              <PackageList dataSource={unused} />
            </Tabs.TabPane>
          </Tabs>
        </Layout.Sider>
        <Layout.Content style={{ padding: 0 }}>
          <VersionTable />
        </Layout.Content>
      </Layout>
    </>
  );
});

const style: Style = {
  sider: { marginRight: 16, padding: 16, paddingTop: 0, height: "100%" },
  title: { paddingLeft: 0, paddingRight: 0 },
};
