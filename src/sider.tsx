import { AppstoreOutlined, UserOutlined } from "@ant-design/icons";
import { Layout, Menu } from "antd";
import { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";

export const defaultPath = "/user";

const menu = [
  {
    icon: () => <UserOutlined />,
    title: "账户设置",
    path: "/user",
  },
  {
    icon: () => <AppstoreOutlined />,
    title: "应用管理",
    path: "/apps",
  },
];

export default () => {
  let { pathname } = useLocation();
  const match = pathname.match(/\/\w+/);
  if (match) {
    pathname = match[0];
  }
  return (
    <Layout.Sider width={200}>
      <Layout.Header style={style.logo}>Pushy</Layout.Header>
      <Menu
        selectedKeys={pathname === "/" ? [defaultPath] : [pathname]}
        theme="dark"
      >
        {menu.map(({ icon, title, path }) => {
          return (
            <Menu.Item key={path} icon={icon()}>
              <Link to={path}>{title}</Link>
            </Menu.Item>
          );
        })}
      </Menu>
    </Layout.Sider>
  );
};

const style: { [name: string]: CSSProperties } = {
  logo: {
    color: "#fff",
    fontSize: 24,
    fontWeight: 600,
  },
};
