import { useState } from 'react';
import { Button, Form, Input, message, Result } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

export default function SendEmail() {
  const [sent, setSent] = useState<boolean>(false);
  const { mutateAsync: sendEmail, isPending } = useMutation({
    mutationFn: (email: string) => api.resetpwdSendMail({ email }),
    onSuccess: () => {
      message.info('邮件发送成功，请注意查收');
    },
    onError: () => {
      message.error('邮件发送失败');
    },
  });

  if (sent) {
    return (
      <Result
        status='success'
        title='验证邮件已发送至您的邮箱，请点击邮件中的链接完成操作'
        subTitle='验证邮件 24 小时有效，请尽快验证！'
      />
    );
  }
  return (
    <Form
      className='w-80 mx-auto'
      onFinish={async (values: { email: string }) => {
        const email = values?.email;
        await sendEmail(email);
        setSent(true);
      }}
    >
      <Form.Item name='email' rules={[{ type: 'email', message: '请输入正确的邮箱' }]}>
        <Input placeholder='输入绑定邮箱' type='email' required />
      </Form.Item>
      <Form.Item>
        <Button type='primary' htmlType='submit' loading={isPending} block>
          发送邮件
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SendEmail;
