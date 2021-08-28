import {
  CommentOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  ReadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu, message, Row } from "antd";
import { Redirect, Route, Switch } from "react-router-dom";
import { Footer } from "./components";
import * as pages from "./pages";
import Sider from "./sider";
import store, { logout } from "./store";

export const defaultRoute = "apps";

export default () => (
  <Layout>
    <Sider />
    <Layout>
      <Layout.Header style={style.header}>
        <Row style={{ height: "100%" }} justify="end">
          <Menu mode="horizontal" selectable={false}>
            <Menu.Item key="issues" icon={<CommentOutlined />}>
              <ExtLink href="https://github.com/reactnativecn/react-native-pushy/issues">
                讨论
              </ExtLink>
            </Menu.Item>
            <Menu.Item key="document" icon={<ReadOutlined />}>
              <ExtLink href="https://pushy.reactnative.cn/docs/getting-started.html">文档</ExtLink>
            </Menu.Item>
            <Menu.Item key="about" icon={<InfoCircleOutlined />}>
              <ExtLink href="https://reactnative.cn/about.html">关于我们</ExtLink>
            </Menu.Item>
            <Menu.SubMenu key="user" icon={<UserOutlined />} title={store.user?.name}>
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
      <Layout.Content id="main-body" style={style.body}>
        <div style={{ flex: 1 }}>
          <Switch>
            <Route path="/user">
              <pages.user />
            </Route>
            <Route path="/apps/:id">
              <pages.versions />
            </Route>
            <Route path="/apps">
              <pages.apps />
            </Route>
            <Redirect from="/" to={`/${defaultRoute}`} />
          </Switch>
        </div>
        <Footer />
      </Layout.Content>
    </Layout>
  </Layout>
);

interface ExtLinkProps {
  children: React.ReactChild;
  href: string;
}

const ExtLink = ({ children, href }: ExtLinkProps) => (
  <a href={href} target="_blank" onClick={(e) => e.stopPropagation()}>
    {children}
  </a>
);

const style: Style = {
  header: {
    background: "#fff",
    height: 48,
    lineHeight: "46px",
    boxShadow: "2px 1px 4px rgba(0, 21, 41, 0.08)",
    zIndex: 1,
  },
  body: {
    overflow: "auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    paddingBottom: 0,
  },
};
