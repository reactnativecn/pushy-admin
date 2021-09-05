import { Button, Result } from "antd";
import store from "../../store";

export default () => (
  <Result
    status="success"
    title="密码设置成功，请重新登录"
    extra={[
      <Button key="login" type="primary" onClick={() => store.history?.push("/login")}>
        登录
      </Button>,
    ]}
  />
);
