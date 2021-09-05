import { Button, Form, Input, Row } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { FormEvent } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import { login } from "../store";

const state = observable.object({ loading: false });

async function submit(event: FormEvent) {
  event.preventDefault();
  runInAction(async () => {
    state.loading = true;
    await login(email, password);
    state.loading = false;
  });
}

let email: string;
let password: string;

export default observer(() => {
  const { loading } = state;
  return (
    <div style={style.body}>
      <form style={style.form} onSubmit={submit}>
        <div style={style.logo}>
          <img src={logo} />
          <div style={style.slogan}>极速热更新框架 for React Native</div>
        </div>
        <Form.Item>
          <Input
            placeholder="邮箱"
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
            placeholder="密码"
            size="large"
            autoComplete=""
            onChange={({ target }) => (password = target.value)}
            required
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            登录
          </Button>
        </Form.Item>
        <Form.Item>
          <Row justify="space-between">
            <Link to="/register">注册</Link>
            <Link to="/reset-password/0">忘记密码？</Link>
          </Row>
        </Form.Item>
      </form>
    </div>
  );
});

const style: Style = {
  body: { display: "flex", flexDirection: "column", height: "100%" },
  form: { width: 320, margin: "auto", paddingTop: 16, flex: 1 },
  logo: { textAlign: "center", margin: "48px 0" },
  slogan: { marginTop: 16, color: "#00000073", fontSize: 18 },
};
