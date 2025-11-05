import { Button, Checkbox, Form, Input, message, Row } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { setUserEmail } from '@/services/auth';
import { ReactComponent as Logo } from '../assets/logo.svg';
import { rootRouterPath, router } from '../router';
import { isPasswordValid } from '../utils/helper';

export const Register = () => {
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
      message.error('该邮箱已被注册');
    }
    setLoading(false);
  }

  return (
    <div style={style.body}>
      <Form style={style.form} onFinish={(values) => submit(values)}>
        <div style={style.logo}>
          <Logo className="mx-auto" />
          <div style={style.slogan}>极速热更新框架 for React Native</div>
        </div>
        <Form.Item name="name" hasFeedback>
          <Input placeholder="用户名" size="large" required />
        </Form.Item>
        <Form.Item name="email" hasFeedback>
          <Input placeholder="邮箱" size="large" type="email" required />
        </Form.Item>
        <Form.Item
          hasFeedback
          name="pwd"
          validateTrigger="onBlur"
          rules={[
            () => ({
              async validator(_, value: string) {
                if (value && !isPasswordValid(value)) {
                  throw '密码中需要同时包含大、小写字母和数字，且长度不少于6位';
                }
              },
            }),
          ]}
        >
          <Input
            type="password"
            placeholder="密码"
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
                  throw '两次输入的密码不一致';
                }
              },
            }),
          ]}
        >
          <Input
            type="password"
            placeholder="再次输入密码"
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
            注册
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
                      : Promise.reject(Error('请阅读并同意后勾选此处')),
                },
              ]}
              hasFeedback
              noStyle
            >
              <Checkbox>
                <span>
                  已阅读并同意
                  <a
                    target="_blank"
                    href="https://pushy.reactnative.cn/agreement/"
                    rel="noreferrer"
                  >
                    用户协议
                  </a>
                </span>
              </Checkbox>
            </Form.Item>
            <span />
            <Link to="/login">已有帐号？</Link>
          </Row>
        </Form.Item>
      </Form>
    </div>
  );
};

export const Component = Register;

const style: Style = {
  body: { display: 'flex', flexDirection: 'column', height: '100%' },
  form: { width: 320, margin: 'auto', paddingTop: 16, flex: 1 },
  logo: { textAlign: 'center', margin: '48px 0' },
  slogan: { marginTop: 16, color: '#00000073', fontSize: 18 },
};
