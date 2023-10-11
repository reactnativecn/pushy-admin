import {
  CommentOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Layout, Menu, message, Row, Spin } from 'antd';
import { observer } from 'mobx-react-lite';
import {
  Redirect,
  Route,
  RouteProps,
  Switch,
  useHistory,
} from 'react-router-dom';
import { ReactNode } from 'react';
import { Footer } from './components';
import * as pages from './pages';
import Login from './pages/login';
import Sider from './sider';
import store, { logout } from './store';

export const defaultRoute = 'user';

export default observer(() => {
  store.history = useHistory();
  return (
    <Layout>
      <Sider />
      <Layout>
        <Layout.Header style={style.header}>
          <Row style={{ height: '100%' }} justify='end'>
            <Menu mode='horizontal' selectable={false}>
              <Menu.Item key='issues' icon={<CommentOutlined />}>
                <ExtLink href='https://github.com/reactnativecn/react-native-pushy/issues'>
                  讨论
                </ExtLink>
              </Menu.Item>
              <Menu.Item key='document' icon={<ReadOutlined />}>
                <ExtLink href='https://pushy.reactnative.cn/docs/getting-started.html'>
                  文档
                </ExtLink>
              </Menu.Item>
              <Menu.Item key='about' icon={<InfoCircleOutlined />}>
                <ExtLink href='https://reactnative.cn/about.html'>
                  关于我们
                </ExtLink>
              </Menu.Item>
              {store.token && (
                <Menu.SubMenu
                  key='user'
                  icon={<UserOutlined />}
                  title={store.user?.name}
                >
                  <Menu.Item
                    key='logout'
                    onClick={() => {
                      logout();
                      message.info('您已退出登录');
                    }}
                    icon={<LogoutOutlined />}
                  >
                    退出登录
                  </Menu.Item>
                </Menu.SubMenu>
              )}
            </Menu>
          </Row>
        </Layout.Header>
        <Layout.Content id='main-body' style={style.body}>
          <div className='h-full'>
            <Switch>
              <Route path='/welcome'>
                <pages.welcome />
              </Route>
              <Route path='/activate'>
                <pages.activate />
              </Route>
              <Route path='/inactivated'>
                <pages.inactivated />
              </Route>
              <Route path='/register'>
                <pages.register />
              </Route>
              <Route path='/reset-password/:step'>
                <pages.resetPassword />
              </Route>
              <UserRoute path='/user'>
                <pages.user />
              </UserRoute>
              <UserRoute path='/apps/:id'>
                <pages.versions />
              </UserRoute>
              <UserRoute path='/apps'>
                <pages.apps />
              </UserRoute>
              <Route
                path='/'
                render={() => <Redirect to={`/${defaultRoute}`} />}
              />
            </Switch>
          </div>
          <Footer />
        </Layout.Content>
      </Layout>
    </Layout>
  );
});

interface ExtLinkProps {
  children: ReactNode;
  href: string;
}

const ExtLink = ({ children, href }: ExtLinkProps) => (
  <a
    href={href}
    target='_blank'
    onClick={(e) => e.stopPropagation()}
    rel='noreferrer'
  >
    {children}
  </a>
);

const UserRoute = observer((props: RouteProps) => {
  if (!store.token) return <Login />;
  if (!store.user) {
    return (
      <div style={style.spin}>
        <Spin size='large' />
      </div>
    );
  }
  return <Route {...props} />;
});

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
  spin: { lineHeight: '100vh', textAlign: 'center' },
};
