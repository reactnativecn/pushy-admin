import { Button, Form, Input, Row } from 'antd';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { login } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo.svg';

export const Login = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div style={style.body}>
      <form
        style={style.form}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          await login(email, password);
          setLoading(false);
        }}
      >
        <div style={style.logo}>
          <Logo className="mx-auto" />
          <div style={style.slogan}>{t('login.slogan')}</div>
        </div>
        <Form.Item>
          <Input
            placeholder={t('login.email_placeholder')}
            size="large"
            type="email"
            autoComplete=""
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Input
            type="password"
            placeholder={t('login.password_placeholder')}
            size="large"
            autoComplete=""
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
            {t('login.login_button')}
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
            <Link to="/register">{t('login.register')}</Link>
            <Link to="/reset-password/0">{t('login.forgot_password')}</Link>
          </Row>
        </Form.Item>
      </form>
    </div>
  );
};

export const Component = Login;

const style: Record<'body' | 'form' | 'logo' | 'slogan', CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', height: '100%' },
  form: {
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
