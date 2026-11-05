import { Button, Checkbox, Form, Input, message, Row } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthFormShell } from '@/pages/auth/auth-form-shell';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { setUserEmail } from '@/services/auth';

const Register = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  async function submit(values: { [key: string]: string }) {
    delete values.agreed;
    setLoading(true);
    try {
      await api.register(values);
      setUserEmail(values.email ?? '');
      router.navigate(rootRouterPath.welcome);
    } catch (_) {
      message.error(t('register.email_exists'));
    }
    setLoading(false);
  }

  return (
    <AuthFormShell slogan={t('register.slogan')}>
      <Form onFinish={(values) => submit(values)}>
        <Form.Item name="name" hasFeedback>
          <Input
            placeholder={t('register.username_placeholder')}
            size="large"
            required
          />
        </Form.Item>
        <Form.Item name="email" hasFeedback>
          <Input
            placeholder={t('register.email_placeholder')}
            size="large"
            type="email"
            required
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
          >
            {t('register.create_button')}
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
            <Form.Item
              name="agreed"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(Error(t('register.agreement_required'))),
                },
              ]}
              hasFeedback
              noStyle
            >
              <Checkbox>
                <span>
                  {t('register.agreement_prefix')}{' '}
                  <a
                    target="_blank"
                    href="https://pushy.reactnative.cn/agreement/"
                    rel="noopener noreferrer"
                  >
                    {t('register.agreement_link')}
                  </a>
                </span>
              </Checkbox>
            </Form.Item>
            <span />
            <Link to={rootRouterPath.login}>{t('register.has_account')}</Link>
          </Row>
        </Form.Item>
      </Form>
    </AuthFormShell>
  );
};

export const Component = Register;
