import { login } from "@/services/auth";
import { Button, Form, Input, Row } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ReactComponent as Logo } from "../assets/logo.svg";

let email: string;
let password: string;

export const Login = () => {
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
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            block
          >
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
};

export const Component = Login;

const style: Style = {
  body: { display: "flex", flexDirection: "column", height: "100%" },
  form: { width: 320, margin: "auto", paddingTop: 16, flex: 1 },
  logo: { textAlign: "center", margin: "48px 0" },
  slogan: { marginTop: 16, color: "#00000073", fontSize: 18 },
};
