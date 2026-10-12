import { Button, Form, Input, Row } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthFormShell } from '@/pages/auth/auth-form-shell';
import { login } from '@/services/auth';

const Login = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <AuthFormShell slogan={t('login.slogan')}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          await login(email, password);
          setLoading(false);
        }}
      >
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
    </AuthFormShell>
  );
};

export const Component = Login;
