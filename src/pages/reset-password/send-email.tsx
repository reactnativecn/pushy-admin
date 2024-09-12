import { useState } from 'react';
import { Button, Form, Input, message, Result } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
// import { observable, runInAction } from 'mobx';
// import { observer } from 'mobx-react-lite';
// import request from '../../services/request';
import { api } from '@/services/api';

export default function Component() {
  const [sent, setSent] = useState<boolean>(false);
  const [formValues, setFormValues] = useState({ email: '' });
  const { isLoading, error } = useQuery({
    queryKey: ['sendEmail', formValues],
    queryFn: () => api.resetpwdSendMail(formValues),
    enabled: !!formValues?.email,
  });

  if (error) {
    return <Result status='error' title={error?.message || '网络错误'} />;
  }
  if (isLoading) {
    return <Result icon={<LoadingOutlined />} title='发送中，请稍等' />;
  }

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
      style={{ width: 320, margin: 'auto' }}
      onFinish={(values: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        setFormValues(values);
        setSent(true);
      }}
    >
      <Form.Item name='email'>
        <Input placeholder='输入绑定邮箱' type='email' required />
      </Form.Item>
      <Form.Item>
        <Button type='primary' htmlType='submit' loading={isLoading} block>
          发送邮件
        </Button>
      </Form.Item>
    </Form>
  );
}
