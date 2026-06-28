import { Button, Form, Input, message } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { rootRouterPath, router } from '../../../router';
import { isPasswordValid } from '../../../utils/helper';

export default function SetPassword() {
  const { t } = useTranslation();
  const { search } = useLocation();
  const [loading, setLoading] = useState<boolean>(false);
  return (
    <Form
      className="m-auto w-80"
      onFinish={async (values: { newPwd: string; pwd2: string }) => {
        setLoading(true);
        try {
          await api.resetPwd({
            token: new URLSearchParams(search).get('code') ?? '',
            newPwd: await md5(values.newPwd),
          });
          router.navigate(rootRouterPath.resetPassword('3'));
        } catch (e) {
          message.error((e as Error).message ?? t('reset_password.network_error'));
        }
        setLoading(false);
      }}
    >
      <Form.Item
        hasFeedback
        name="newPwd"
        rules={[
          () => ({
            validator(_, value: string) {
              if (value && !isPasswordValid(value)) {
                return Promise.reject(
                  Error(t('reset_password.password_rules')),
                );
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input type="password" placeholder={t('reset_password.new_password_placeholder')} autoComplete="" required />
      </Form.Item>
      <Form.Item
        hasFeedback
        name="pwd2"
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value: string) {
              if (getFieldValue('newPwd') !== value) {
                return Promise.reject(Error(t('reset_password.password_mismatch')));
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input
          type="password"
          placeholder={t('reset_password.confirm_placeholder')}
          autoComplete=""
          required
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          {t('reset_password.save_button')}
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SetPassword;
