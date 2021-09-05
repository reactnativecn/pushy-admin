import { Button, Form, Input, message } from "antd";
import md5 from "md5";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import logo from "../assets/logo.svg";
import request from "../request";
import store from "../store";

const state = observable.object({ loading: false });

async function submit(values: { [key: string]: string }) {
  delete values.pwd2;
  values.pwd = md5(values.pwd);
  runInAction(() => (state.loading = true));
  try {
    await request("post", "user/register", values);
    message.success("注册成功");
    store.history?.goBack();
  } catch (_) {
    message.error("该邮箱已被注册");
  }
  runInAction(() => (state.loading = false));
}

export default observer(() => {
  const { loading } = state;
  return (
    <div style={style.body}>
      <Form style={style.form} onFinish={(values) => submit(values)}>
        <div style={style.logo}>
          <img src={logo} />
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
              async validator(_, value) {
                if (!isPasswordValid(value)) {
                  throw "密码中需要同时包含大、小写字母和数字，且长度不少于6位";
                }
              },
            }),
          ]}
        >
          <Input type="password" placeholder="密码" size="large" autoComplete="" required />
        </Form.Item>
        <Form.Item
          hasFeedback
          name="pwd2"
          validateTrigger="onBlur"
          rules={[
            ({ getFieldValue }) => ({
              async validator(_, value) {
                if (getFieldValue("pwd") != value) {
                  throw "两次输入的密码不一致";
                }
              },
            }),
          ]}
        >
          <Input type="password" placeholder="再次输入密码" size="large" autoComplete="" required />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} block>
            注册
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
});

function isPasswordValid(password: string) {
  return /(?!^[0-9]+$)(?!^[a-z]+$)(?!^[^A-Z]+$)^.{6,16}$/.test(password);
}

const style: Style = {
  body: { display: "flex", flexDirection: "column", height: "100%" },
  form: { width: 320, margin: "auto", paddingTop: 16, flex: 1 },
  logo: { textAlign: "center", margin: "48px 0" },
  slogan: { marginTop: 16, color: "#00000073", fontSize: 18 },
};
