import { Grid, Layout } from 'antd';
import type { CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUserInfo } from '@/utils/hooks';
import Footer from './footer';
import TopNavigation from './top-navigation';

interface Style {
  header: CSSProperties;
  body: CSSProperties;
}

const MainLayout = () => {
  const { user } = useUserInfo();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const usesPublicChrome = [
    '/activate',
    '/inactivated',
    '/login',
    '/register',
    '/reset-password',
    '/welcome',
  ].some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );
  const showAuthenticatedChrome = Boolean(user) && !usesPublicChrome;

  return (
    <Layout>
      <Layout>
        <Layout.Header
          style={{ ...style.header, paddingInline: isMobile ? 12 : 24 }}
        >
          <TopNavigation
            isMobile={isMobile}
            showAuthenticatedChrome={showAuthenticatedChrome}
          />
        </Layout.Header>
        <Layout.Content id="main-body" style={style.body}>
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

const style: Style = {
  header: {
    background: '#fff',
    minHeight: 64,
    height: 'auto',
    lineHeight: 'normal',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: 'none',
    zIndex: 10,
  },
  body: {
    overflow: 'auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 0,
  },
};
