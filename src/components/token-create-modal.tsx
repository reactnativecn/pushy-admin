import { Button, Form, type FormInstance, Input, Modal, Select } from 'antd';
import type { ReactNode } from 'react';
import type { AppOption } from '@/utils/app-options';
import { useModalWidth } from '@/utils/responsive';

export interface TokenCreateModalProps<Values> {
  open: boolean;
  onCancel: () => void;
  form: FormInstance<Values>;
  onFinish: (values: Values) => void;
  /** 桌面端宽度，移动端自动铺满 */
  width: number;
  title: string;
  loading: boolean;
  submitText: string;
  /** 名称字段文案：label / 必填提示 / 占位 */
  nameLabel: string;
  nameRequired: string;
  namePlaceholder: string;
  /** 名称字段与提交按钮之间的其余表单项 */
  children: ReactNode;
}

/**
 * 创建 API Key / MCP 连接的弹窗骨架：名称在前、提交按钮在后，
 * 中间的权限/scope 等字段两边差异大，由页面自己放进 children。
 * 关闭时清空表单，避免下次打开残留上次的输入。
 */
export function TokenCreateModal<Values>({
  open,
  onCancel,
  form,
  onFinish,
  width,
  title,
  loading,
  submitText,
  nameLabel,
  nameRequired,
  namePlaceholder,
  children,
}: TokenCreateModalProps<Values>) {
  const modalWidth = useModalWidth(width);
  return (
    <Modal
      title={title}
      open={open}
      width={modalWidth}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label={nameLabel}
          name="name"
          rules={[{ required: true, message: nameRequired }]}
        >
          <Input placeholder={namePlaceholder} maxLength={100} />
        </Form.Item>
        {children}
        <Form.Item className="mb-0">
          <Button type="primary" htmlType="submit" loading={loading} block>
            {submitText}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export interface TokenAppsFormItemProps {
  label: string;
  extra: string;
  /** 不选即全部应用，占位文案说明这一点 */
  placeholder: string;
  options: AppOption[];
}

/** 限定 token 可访问的应用（字段名固定 appIds，留空表示不限） */
export function TokenAppsFormItem({
  label,
  extra,
  placeholder,
  options,
}: TokenAppsFormItemProps) {
  return (
    <Form.Item label={label} name="appIds" extra={extra}>
      <Select
        mode="multiple"
        allowClear
        placeholder={placeholder}
        options={options}
      />
    </Form.Item>
  );
}
