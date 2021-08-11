import { Button, Form, Input } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import { FormEvent } from "react";
import { login } from "../store";
import { Style } from "../types";

const state = observable.object({ loading: false });

async function submit(event: FormEvent) {
  event.preventDefault();
  runInAction(async () => {
    state.loading = true;
    await login(username, password);
    state.loading = false;
  });
}

let username: string;
let password: string;

export default observer(() => {
  const { loading } = state;
  return (
    <form style={style.form} onSubmit={submit}>
      <Form.Item>
        <Input placeholder="帐号" onChange={({ target }) => (username = target.value)} required />
      </Form.Item>
      <Form.Item>
        <Input
          type="password"
          onChange={({ target }) => (password = target.value)}
          placeholder="密码"
          required
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>
    </form>
  );
});

const style: Style = {
  form: { width: 320, margin: "auto", paddingTop: 80 },
};
