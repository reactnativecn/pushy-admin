import { Button, Checkbox, Form, Input, message, Row } from 'antd';
import { md5 } from 'hash-wasm';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { setUserEmail } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo.svg';
import { rootRouterPath, router } from '../router';
import { isPasswordValid } from '../utils/helper';

export const Register = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);

  async function submit(values: { [key: string]: string }) {
    delete values.pwd2;
    delete values.agreed;
    values.pwd = await md5(values.pwd);
    setLoading(true);
    try {
      await api.register(values);
      setUserEmail(values.email);
      router.navigate(rootRouterPath.welcome);
    } catch (_) {
      message.error(t('register.email_exists'));
    }
    setLoading(false);
  }

  return (
    <div style={style.body}>
      <Form style={style.form} onFinish={(values) => submit(values)}>
        <div style={style.logo}>
          <Logo className="mx-auto" />
          <div style={style.slogan}>{t('register.slogan')}</div>
        </div>
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
          rules={[
            () => ({
              async validator(_, value: string) {
                if (value && !isPasswordValid(value)) {
                  throw t('register.password_rules');
                }
              },
            }),
          ]}
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
            ({ getFieldValue }) => ({
              async validator(_, value: string) {
                if (getFieldValue('pwd') !== value) {
                  throw t('register.password_mismatch');
                }
              },
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
    </div>
  );
};

export const Component = Register;

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
