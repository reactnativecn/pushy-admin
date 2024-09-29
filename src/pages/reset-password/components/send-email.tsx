import { useState } from 'react';
import { Button, Form, Input, message, Result } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { getUserEmail, setUserEmail } from '@/services/auth';

export default function SendEmail() {
  const [sent, setSent] = useState<boolean>(false);
  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: () => api.resetpwdSendMail({ email: getUserEmail() }),
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
      onFinish={(values: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        setUserEmail(values?.email);
        setSent(true);
      }}
    >
      <Form.Item name='email'>
        <Input placeholder='输入绑定邮箱' type='email' required />
      </Form.Item>
      <Form.Item>
        <Button
          type='primary'
          htmlType='submit'
          onClick={() => sendEmail()}
          loading={isPending}
          block
        >
          发送邮件
        </Button>
      </Form.Item>
    </Form>
  );
}

export const Component = SendEmail;
