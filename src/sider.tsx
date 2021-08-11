import {
  AppstoreOutlined,
  CommentOutlined,
  InfoCircleOutlined,
  ReadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import { observer } from "mobx-react";
import { Link, useLocation } from "react-router-dom";
import { defaultRoute } from "./layout";
import { Style } from "./types";

let keys: string[] | undefined;

export default () => {
  let { pathname } = useLocation();
  if (keys == null) {
    if (pathname == "/") {
      keys = [defaultRoute];
    } else {
      keys = pathname.replace(/^\//, "").split("/");
    }
  }
  return (
    <Layout.Sider width={200} theme="light" style={style.sider}>
      <Layout.Header style={style.logo}>Pushy</Layout.Header>
      <SiderMenu keys={keys} />
    </Layout.Sider>
  );
};

const SiderMenu = observer(({ keys }: { keys: string[] }) => (
  <Menu defaultOpenKeys={keys} defaultSelectedKeys={keys} mode="inline">
    <Menu.Item key="user" icon={<UserOutlined />}>
      <Link to="/user">账户设置</Link>
    </Menu.Item>
    <Menu.Item key="apps" icon={<AppstoreOutlined />}>
      <Link to="/apps">应用管理</Link>
    </Menu.Item>
    <Menu.Item key="issues" icon={<CommentOutlined />}>
      <ExtLink href="https://github.com/reactnativecn/react-native-pushy/issues">讨论</ExtLink>
    </Menu.Item>
    <Menu.Item key="document" icon={<ReadOutlined />}>
      <ExtLink href="https://pushy.reactnative.cn/docs/getting-started.html">文档</ExtLink>
    </Menu.Item>
    <Menu.Item key="about" icon={<InfoCircleOutlined />}>
      <ExtLink href="https://reactnative.cn/about.html">关于我们</ExtLink>
    </Menu.Item>
  </Menu>
));

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
  sider: { boxShadow: "2px 0 8px 0 rgb(29 35 41 / 5%)", zIndex: 2 },
  logo: {
    background: "#fff",
    color: "#1890ff",
    fontSize: 22,
    fontWeight: 600,
  },
};
