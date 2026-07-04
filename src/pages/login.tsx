import { Button, Form, Input, Row } from 'antd';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { login } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo.svg';

let email: string;
let password: string;

export const Login = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
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
            onChange={({ target }) => (email = target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Input
            type="password"
            placeholder={t('login.password_placeholder')}
            size="large"
            autoComplete=""
            onChange={({ target }) => (password = target.value)}
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
  slogan: { marginTop: 16, color: '#00000073', fontSize: 18 },
};
