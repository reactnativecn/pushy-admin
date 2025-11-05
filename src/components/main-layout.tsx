import {
  CommentOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Menu, message, Row } from 'antd';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { logout } from '@/services/auth';
import { useUserInfo } from '@/utils/hooks';
import Footer from './footer';
import Sider from './sider';

interface Style {
  header: React.CSSProperties;
  body: React.CSSProperties;
}

const MainLayout = () => {
  const { user } = useUserInfo();

  return (
    <Layout>
      <Sider />
      <Layout>
        <Layout.Header style={style.header}>
          <Row className="h-full" justify="end">
            <Menu
              mode="horizontal"
              selectable={false}
              items={[
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
                  label: (
                    <ExtLink href="https://reactnative.cn/about.html">
                      关于我们
                    </ExtLink>
                  ),
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
              ]}
            />
          </Row>
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
