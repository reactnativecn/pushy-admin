import { Button, Form, Input, message } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useLocation } from "react-router-dom";
import request, { RequestError } from "../../request";
import { isPasswordValid } from "../../utils";
import store from "../../store";
import md5 from "blueimp-md5";

const state = observable.object({ loading: false });

export default observer(() => {
  const { search } = useLocation();
  return (
    <Form
      style={{ width: 320, margin: "auto" }}
      onFinish={async (values) => {
        runInAction(() => (state.loading = true));
        try {
          delete values.pwd2;
          values.token = new URLSearchParams(search).get("code");
          values.newPwd = md5(values.newPwd);
          await request("post", "user/resetpwd/reset", values);
          store.history.replace("/reset-password/3");
        } catch (e) {
          console.log(e);
          message.error((e as RequestError).message ?? "网络错误");
        }
        runInAction(() => (state.loading = false));
      }}
    >
      <Form.Item
        hasFeedback
        name="newPwd"
        validateTrigger="onBlur"
        rules={[
          () => ({
            async validator(_, value) {
              if (value && !isPasswordValid(value)) {
                throw "密码中需要同时包含大、小写字母和数字，且长度不少于6位";
              }
            },
          }),
        ]}
      >
        <Input type="password" placeholder="新密码" autoComplete="" required />
      </Form.Item>
      <Form.Item
        hasFeedback
        name="pwd2"
        validateTrigger="onBlur"
        rules={[
          ({ getFieldValue }) => ({
            async validator(_, value) {
              if (getFieldValue("newPwd") != value) {
                throw "两次输入的密码不一致";
              }
            },
          }),
        ]}
      >
        <Input type="password" placeholder="再次输入密码" autoComplete="" required />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={state.loading} block>
          确认修改
        </Button>
      </Form.Item>
    </Form>
  );
});
