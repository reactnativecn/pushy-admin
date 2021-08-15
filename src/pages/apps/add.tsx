import { AndroidFilled, AppleFilled } from "@ant-design/icons";
import { Form, Input, message, Modal, Select } from "antd";
import request from "../../request";
import "./index.css";
import { fetchApps } from "./state";
import { style } from ".";

export default function () {
  let name = "";
  let platform = "android";
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form initialValues={{ platform }}>
        <br />
        <Form.Item label="应用名称" name="name">
          <Input placeholder="请输入应用名称" onChange={({ target }) => (name = target.value)} />
        </Form.Item>
        <Form.Item label="选择平台" name="platform">
          <Select
            // @ts-ignore
            onSelect={(value) => (platform = value)}
          >
            <Select.Option value="android">
              <AndroidFilled style={style.android} /> Android
            </Select.Option>
            <Select.Option value="ios">
              <AppleFilled style={style.ios} /> iOS
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    onOk(_) {
      if (!name) {
        message.warn("请输入应用名称");
        return false;
      }
      return request("post", "app/create", { name, platform })
        .then(fetchApps)
        .catch((error) => {
          message.error(error.message);
        });
    },
  });
}
