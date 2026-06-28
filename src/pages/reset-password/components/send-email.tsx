import { useMutation } from '@tanstack/react-query';
import { Button, Form, Input, message, Result } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';

export default function SendEmail() {
  const { t } = useTranslation();
  const [sent, setSent] = useState<boolean>(false);
  const { mutateAsync: sendEmail, isPending } = useMutation({
    mutationFn: (email: string) => api.resetpwdSendMail({ email }),
    onSuccess: () => {
      message.info(t('reset_password.send_success'));
    },
    onError: () => {
      message.error(t('reset_password.send_failed'));
    },
  });

  if (sent) {
    return (
      <Result
        status="success"
        title={t('reset_password.verification_sent')}
        subTitle={t('reset_password.verification_valid')}
      />
    );
  }
  return (
    <Form
      className="w-80 mx-auto"
      onFinish={async (values: { email: string }) => {
        const email = values?.email;
        await sendEmail(email);
        setSent(true);
      }}
    >
      <Form.Item
        name="email"
        rules={[{ type: 'email', message: t('reset_password.email_invalid') }]}
      >
        <Input placeholder={t('reset_password.email_placeholder')} type="email" required />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending} block>
          {t('reset_password.send_button')}
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SendEmail;
