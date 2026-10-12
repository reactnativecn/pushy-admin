import { Button, Checkbox, Form, Input, message, Row } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthFormShell } from '@/pages/auth/auth-form-shell';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { setUserEmail } from '@/services/auth';
import {
  confirmPasswordRule,
  passwordFormatRule,
} from '@/utils/password-rules';

const Register = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  async function submit(values: { [key: string]: string }) {
    delete values.pwd2;
    delete values.agreed;
    values.pwd = await md5(values.pwd ?? '');
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
        <Form.Item
          hasFeedback
          name="pwd"
          validateTrigger="onBlur"
          rules={[passwordFormatRule(t('register.password_rules'))]}
        >
          <Input
            type="password"
            placeholder={t('register.password_placeholder')}
            size="large"
            autoComplete=""
            required
          />
        </Form.Item>
        <Form.Item
          hasFeedback
          name="pwd2"
          validateTrigger="onBlur"
          rules={[
            confirmPasswordRule({
              field: 'pwd',
              message: t('register.password_mismatch'),
              allowEmpty: false,
            }),
          ]}
        >
          <Input
            type="password"
            placeholder={t('register.confirm_password_placeholder')}
            size="large"
            autoComplete=""
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
