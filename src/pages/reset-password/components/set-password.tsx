import { Button, Form, Input, message } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { rootRouterPath, router } from '../../../router';
import { isPasswordValid } from '../../../utils/helper';

export default function SetPassword() {
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
          console.log(e);
          message.error((e as Error).message ?? '网络错误');
        }
        setLoading(false);
      }}
    >
      <Form.Item
        hasFeedback
        name="newPwd"
        // validateTrigger='onBlur'
        rules={[
          () => ({
            validator(_, value: string) {
              if (value && !isPasswordValid(value)) {
                return Promise.reject(
                  Error(
                    '密码中需要同时包含大、小写字母和数字，且长度不少于6位',
                  ),
                );
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input type="password" placeholder="新密码" autoComplete="" required />
      </Form.Item>
      <Form.Item
        hasFeedback
        name="pwd2"
        // validateTrigger='onBlur'
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value: string) {
              if (getFieldValue('newPwd') !== value) {
                return Promise.reject(Error('两次输入的密码不一致'));
              }
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input
          type="password"
          placeholder="再次输入密码"
          autoComplete=""
          required
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          确认修改
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SetPassword;
