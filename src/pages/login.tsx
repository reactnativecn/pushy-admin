/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
import { FormEvent, useEffect, useState } from 'react';
import { Button, Form, Input, Row, message } from 'antd';
import md5 from 'blueimp-md5';
import { Link } from 'react-router-dom';
import { history } from '../index';
import logo from '../assets/logo.svg';
import store from '../store';
import { request, API, RequestError } from '../utils';
import useUserInfo from '../hooks/useUserInfo';

// const state = observable.object({ loading: false });

let email: string;
let password: string;

export default function Login() {
  // const { loading } = state;
  const [loading, setLoading] = useState(false);
  const { fetchUserInfo } = useUserInfo();

  useEffect(() => {
    init();
  }, []);

  function init() {
    const token = localStorage.getItem('token');
    if (token) {
      return fetchUserInfo();
    }
  }

  async function submit(event: FormEvent) {
    event?.preventDefault();
    // state.loading = true;
    setLoading(true);
    await login(email, password);
    // state.loading = false;
    setLoading(false);
  }

  async function login(email: string, password: string) {
    const params = { email, pwd: md5(password) };
    try {
      const { token } = await request('post', API.loginUrl, params);
      localStorage.setItem('token', token);
      message.success('登录成功');
      fetchUserInfo();
      history.push('/user'); // TODO 此处有bug  登录成功后没有跳页面 需要刷新一下才会去到user页面
    } catch (e) {
      if (e instanceof RequestError) {
        if (e.code === 423) {
          history.push('/inactivated');
        } else {
          message.error(e.message);
        }
      }
    }
  }

  return (
    <div style={style.body}>
      <form style={style.form} onSubmit={submit}>
        <div style={style.logo}>
          <img src={logo} className='mx-auto' alt='' />
          <div style={style.slogan}>极速热更新框架 for React Native</div>
        </div>
        <Form.Item>
          <Input
            placeholder='邮箱'
            size='large'
            type='email'
            autoComplete=''
            onChange={({ target }) => (email = target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Input
            type='password'
            placeholder='密码'
            size='large'
            autoComplete=''
            onChange={({ target }) => (password = target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit' size='large' loading={loading} block>
            登录
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify='space-between'>
            <Link to='/register'>注册</Link>
            <Link to='/reset-password/0'>忘记密码？</Link>
          </Row>
        </Form.Item>
      </form>
    </div>
  );
}

const style: Style = {
  body: { display: 'flex', flexDirection: 'column', height: '100%' },
  form: { width: 320, margin: 'auto', paddingTop: 16, flex: 1 },
  logo: { textAlign: 'center', margin: '48px 0' },
  slogan: { marginTop: 16, color: '#00000073', fontSize: 18 },
};
