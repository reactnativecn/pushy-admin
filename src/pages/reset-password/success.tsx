import { Button, Result } from "antd";

export default () => (
  <Result
    status="success"
    title="密码设置成功，请重新登录"
    extra={[
      <Button key="login" type="primary" href="/login">
        登录
      </Button>,
    ]}
  />
);
