import { LogoutOutlined } from "@ant-design/icons";
import { Layout, Menu, Row, message } from "antd";
import { Redirect, Route, Switch } from "react-router-dom";
import * as pages from "./pages";
import Sider from "./sider";
import store, { logout } from "./store";

export const defaultRoute = "user";

export default () => (
  <Layout>
    <Sider />
    <Layout>
      <Layout.Header style={style.header}>
        <Row justify="end">
          <Menu mode="horizontal" selectable={false}>
            <Menu.SubMenu key="user" title={store.user?.name}>
              <Menu.Item
                key="logout"
                onClick={() => {
                  logout();
                  message.info("您已退出登录");
                }}
                icon={<LogoutOutlined />}
              >
                退出登录
              </Menu.Item>
            </Menu.SubMenu>
          </Menu>
        </Row>
      </Layout.Header>
      <Layout.Content id="main-body" style={{ overflow: "auto", position: "relative" }}>
        <Switch>
          <Route path="/user">
            <pages.user />
          </Route>
          <Route path="/apps">
            <pages.apps />
          </Route>
          <Redirect from="/" to={`/${defaultRoute}`} />
        </Switch>
      </Layout.Content>
    </Layout>
  </Layout>
);

const style: Style = {
  header: {
    background: "#fff",
    height: 48,
    lineHeight: "46px",
    boxShadow: "2px 1px 4px rgba(0, 21, 41, 0.08)",
    zIndex: 1,
  },
};
