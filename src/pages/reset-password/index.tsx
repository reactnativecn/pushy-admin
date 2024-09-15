import { Card, Steps } from 'antd';
import { useParams } from 'react-router-dom';
import SendEmail from './send-email';
import SetPassword from './set-password';
import Success from './success';

const body = {
  '0': <SendEmail />,
  '1': <SetPassword />,
  '3': <Success />,
};

export const ResetPassword = () => {
  const { step = '0' } = useParams() as { step?: keyof typeof body };
  return (
    <Card style={{ width: 760, margin: 'auto' }}>
      <Steps style={{ marginBottom: 48 }} current={Number(step)}>
        <Steps.Step title='输入绑定邮箱' />
        <Steps.Step title='设置新密码' />
        <Steps.Step title='设置成功' />
      </Steps>
      {body[step]}
    </Card>
  );
};

export const Component = ResetPassword;
