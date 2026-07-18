import { Button, Form, Input, Modal, message } from 'antd';
import { md5 } from 'hash-wasm';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { setToken } from '@/services/request';
import { isPasswordValid } from '@/utils/helper';

interface EmailChangeValues {
  newEmail: string;
  currentPassword: string;
}

interface PasswordChangeValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EmailChangeButton({ currentEmail }: { currentEmail: string }) {
  const { t } = useTranslation();
  const [form] = Form.useForm<EmailChangeValues>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    form.resetFields();
  };

  const submit = async (values: EmailChangeValues) => {
    setSubmitting(true);
    try {
      await api.requestEmailChange({
        newEmail: values.newEmail.trim(),
        pwd: await md5(values.currentPassword),
      });
      message.success(t('user.email_change_sent'));
      close();
    } catch (error) {
      message.error(getErrorMessage(error, t('user.email_change_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button type="link" className="h-auto p-0" onClick={() => setOpen(true)}>
        {t('user.change_email')}
      </Button>
      <Modal
        title={t('user.change_email')}
        open={open}
        onCancel={close}
        footer={null}
        destroyOnHidden
      >
        <p className="mb-4 text-gray-500 text-sm">
          {t('user.change_email_hint')}
        </p>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            label={t('user.new_email')}
            name="newEmail"
            rules={[
              { required: true, message: t('user.new_email_required') },
              { type: 'email', message: t('user.new_email_invalid') },
              { max: 50, message: t('user.new_email_too_long') },
              {
                validator: (_, value: string) =>
                  value?.trim().toLowerCase() === currentEmail.toLowerCase()
                    ? Promise.reject(Error(t('user.email_unchanged')))
                    : Promise.resolve(),
              },
            ]}
          >
            <Input type="email" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label={t('user.current_password')}
            name="currentPassword"
            rules={[
              { required: true, message: t('user.current_password_required') },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {t('user.send_verification_email')}
          </Button>
        </Form>
      </Modal>
    </>
  );
}

export function PasswordChangeButton() {
  const { t } = useTranslation();
  const [form] = Form.useForm<PasswordChangeValues>();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    form.resetFields();
  };

  const submit = async (values: PasswordChangeValues) => {
    setSubmitting(true);
    try {
      const response = await api.changePassword({
        currentPwd: await md5(values.currentPassword),
        newPwd: await md5(values.newPassword),
      });
      setToken(response.token);
      message.success(t('user.password_changed'));
      close();
    } catch (error) {
      message.error(getErrorMessage(error, t('user.password_change_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button type="link" className="h-auto p-0" onClick={() => setOpen(true)}>
        {t('user.change_password')}
      </Button>
      <Modal
        title={t('user.change_password')}
        open={open}
        onCancel={close}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            label={t('user.current_password')}
            name="currentPassword"
            rules={[
              { required: true, message: t('user.current_password_required') },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label={t('user.new_password')}
            name="newPassword"
            rules={[
              { required: true, message: t('user.new_password_required') },
              {
                validator: (_, value: string) =>
                  !value || isPasswordValid(value)
                    ? Promise.resolve()
                    : Promise.reject(Error(t('user.password_rules'))),
              },
              ({ getFieldValue }) => ({
                validator: (_, value: string) =>
                  value && value === getFieldValue('currentPassword')
                    ? Promise.reject(Error(t('user.password_unchanged')))
                    : Promise.resolve(),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label={t('user.confirm_password')}
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('user.confirm_password_required') },
              ({ getFieldValue }) => ({
                validator: (_, value: string) =>
                  !value || value === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject(Error(t('user.password_mismatch'))),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {t('user.save_password')}
          </Button>
        </Form>
      </Modal>
    </>
  );
}
