import type { CSSProperties, ReactNode } from 'react';
import { ReactComponent as Logo } from '@/assets/logo.svg';

/** 登录、注册页共用的外框：居中窄栏 + Logo 与标语，表单作为 children 传入。 */
export function AuthFormShell({
  slogan,
  children,
}: {
  slogan: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={style.body}>
      <div style={style.container}>
        <div style={style.logo}>
          <Logo className="mx-auto" />
          <div style={style.slogan}>{slogan}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

const style: Record<'body' | 'container' | 'logo' | 'slogan', CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', height: '100%' },
  container: {
    width: '100%',
    maxWidth: 360,
    margin: 'auto',
    padding: '16px 16px 0',
    flex: 1,
  },
  logo: { textAlign: 'center', margin: '48px 0' },
  slogan: {
    marginTop: 16,
    color: 'var(--ant-color-text-secondary)',
    fontSize: 18,
  },
};
