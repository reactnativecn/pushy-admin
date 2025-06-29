import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button, message, Result } from 'antd';
import { useEffect } from 'react';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';

function InactivatedComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getUserEmail()) {
      navigate({ to: '/login' });
    }
  }, [navigate]);

  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: () => api.sendEmail({ email: getUserEmail() }),
    onSuccess: () => {
      message.info('邮件发送成功，请注意查收');
    },
    onError: () => {
      message.error('邮件发送失败');
    },
  });
  return (
    <Result
      title="您的账号还未激活，请查看您的邮箱"
      subTitle="如未收到激活邮件，请点击"
      extra={[
        <Button
          key="resend"
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
        >
          再次发送
        </Button>,
        <Button key="back" href="/user">
          返回登录
        </Button>,
      ]}
    />
  );
}

export const Route = createFileRoute('/inactivated')({
  component: InactivatedComponent,
});
