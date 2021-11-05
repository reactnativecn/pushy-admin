import { Button, message, Result } from "antd";
import { observable } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import request from "../request";
import store from "../store";

const state = observable.object({ loading: false });

export default observer(() => {
  useEffect(() => {
    if (!store.email) {
      store.history.replace("/login");
    }
  }, []);
  return (
    <Result
      title="您的账号还未激活，请查看您的邮箱"
      subTitle="如未收到激活邮件，请点击"
      extra={[
        <Button key="resend" type="primary" onClick={sendEmail} loading={state.loading}>
          再次发送
        </Button>,
        <Button key="back" href="/user">
          返回登录
        </Button>,
      ]}
    />
  );
});

async function sendEmail() {
  const { email } = store;
  state.loading = true;
  try {
    await request("post", "user/active/sendmail", { email });
    message.info("邮件发送成功，请注意查收");
  } catch (_) {
    message.error("邮件发送失败");
  }
  state.loading = false;
}
