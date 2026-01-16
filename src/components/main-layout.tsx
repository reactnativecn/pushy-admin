import {
  CommentOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoreOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Grid, Layout, Menu, message } from 'antd';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { logout } from '@/services/auth';
import { useUserInfo } from '@/utils/hooks';
import { ReactComponent as LogoH } from '../assets/logo-h.svg';
import Footer from './footer';
import Sider, { SiderDrawer } from './sider';

interface Style {
  header: React.CSSProperties;
  body: React.CSSProperties;
}

const MainLayout = () => {
  const { user } = useUserInfo();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isMobile && mobileNavOpen) {
      setMobileNavOpen(false);
    }
  }, [isMobile, mobileNavOpen]);

  const headerItems: MenuProps['items'] = [
    {
      key: 'issues',
      icon: <CommentOutlined />,
      label: (
        <ExtLink href="https://github.com/reactnativecn/react-native-pushy/issues">
          讨论
        </ExtLink>
      ),
    },
    {
      key: 'document',
      icon: <ReadOutlined />,
      label: (
        <ExtLink href="https://pushy.reactnative.cn/docs/getting-started.html">
          文档
        </ExtLink>
      ),
    },
    {
      key: 'about',
      icon: <InfoCircleOutlined />,
      label: <ExtLink href="https://reactnative.cn/about.html">关于我们</ExtLink>,
    },
    ...(user
      ? [
          {
            key: 'user',
            icon: <UserOutlined />,
            label: user.name,
            children: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: () => {
                  logout();
                  message.info('您已退出登录');
                },
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <Layout>
      {!isMobile && <Sider />}
      {isMobile && (
        <SiderDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
      )}
      <Layout>
        <Layout.Header
          style={{ ...style.header, paddingInline: isMobile ? 12 : 24 }}
        >
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {user && isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileNavOpen(true)}
                />
              )}
              {isMobile && (
                <LogoH className="h-6 w-auto max-w-[140px]" />
              )}
            </div>
            <div className="flex items-center">
              {isMobile ? (
                <Dropdown
                  menu={{ items: headerItems, selectable: false }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
              ) : (
                <Menu mode="horizontal" selectable={false} items={headerItems} />
              )}
            </div>
          </div>
        </Layout.Header>
        <Layout.Content id="main-body" style={style.body}>
          <div className="h-full">
            <Outlet />
          </div>
          <Footer />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

interface ExtLinkProps {
  children: ReactNode;
  href: string;
}

const ExtLink = ({ children, href }: ExtLinkProps) => (
  <a
    href={href}
    target="_blank"
    // onClick={(e) => e.stopPropagation()}
    rel="noreferrer"
  >
    {children}
  </a>
);

const style: Style = {
  header: {
    background: '#fff',
    height: 48,
    lineHeight: '46px',
    boxShadow: '2px 1px 4px rgba(0, 21, 41, 0.08)',
    zIndex: 1,
  },
  body: {
    overflow: 'auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 0,
  },
};
