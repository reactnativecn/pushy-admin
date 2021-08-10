import { AppstoreFilled, UserOutlined } from "@ant-design/icons";
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

const SiderMenu = observer(({ keys }: { keys: string[] }) => {
  return (
    <Menu defaultOpenKeys={keys} defaultSelectedKeys={keys} mode="inline">
      <Menu.Item key="user" icon={<UserOutlined />}>
        <Link to="/user">账户设置</Link>
      </Menu.Item>
      <Menu.Item key="apps" icon={<AppstoreFilled />}>
        <Link to="/apps">应用管理</Link>
      </Menu.Item>
    </Menu>
  );
});

const style: Style = {
  sider: { boxShadow: "2px 0 8px 0 rgb(29 35 41 / 5%)", zIndex: 2 },
  logo: {
    background: "#fff",
    color: "#1890ff",
    fontSize: 22,
    fontWeight: 600,
  },
};
