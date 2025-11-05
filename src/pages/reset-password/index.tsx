import { Card, Steps } from 'antd';
import { useParams } from 'react-router-dom';
import SendEmail from './components/send-email';
import SetPassword from './components/set-password';
import Success from './components/success';

const body = {
  '0': <SendEmail />,
  '1': <SetPassword />,
  '3': <Success />,
};

export const ResetPassword = () => {
  const { step = '0' } = useParams() as { step?: keyof typeof body };
  return (
    <Card className="w-max mx-auto">
      <Steps className="mb-12" current={Number(step)}>
        <Steps.Step title="输入绑定邮箱" />
        <Steps.Step title="设置新密码" />
        <Steps.Step title="设置成功" />
      </Steps>
      {body[step]}
    </Card>
  );
};

export const Component = ResetPassword;
