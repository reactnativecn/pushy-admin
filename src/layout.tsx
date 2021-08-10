import { LogoutOutlined } from "@ant-design/icons";
import { Layout, Menu, Row } from "antd";
import { CSSProperties } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import * as pages from "./pages";
import Sider, { defaultPath } from "./sider";
import store, { logout } from "./store";

export default () => (
  <Layout>
    <Sider />
    <Layout>
      <Layout.Header style={style.header}>
        <Row justify="end">
          <Menu mode="horizontal" selectable={false}>
            <Menu.SubMenu title={store.user?.name}>
              <Menu.Item onClick={logout} icon={<LogoutOutlined />}>
                退出登录
              </Menu.Item>
            </Menu.SubMenu>
          </Menu>
        </Row>
      </Layout.Header>
      <Layout.Content
        id="main-body"
        style={{ overflow: "auto", position: "relative" }}
      >
        <Switch>
          <Route path="/user">
            <pages.user />
          </Route>
          <Route path="/apps">
            <pages.apps />
          </Route>
          <Redirect from="/" to={defaultPath} />
        </Switch>
      </Layout.Content>
    </Layout>
  </Layout>
);

const style: { [name: string]: CSSProperties } = {
  header: {
    background: "#fff",
    height: 48,
    lineHeight: "46px",
    boxShadow: "0 1px 4px rgba(0, 21, 41, 0.08)",
    zIndex: 1,
  },
};
