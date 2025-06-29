import { createFileRoute, useParams } from "@tanstack/react-router";
import { Card, Steps } from "antd";
import SendEmail from "./-components/send-email";
import SetPassword from "./-components/set-password";
import Success from "./-components/success";

const body = {
  "0": <SendEmail />,
  "1": <SetPassword />,
  "3": <Success />,
};

function ResetPasswordComponent() {
  const { step = "0" } = useParams({ from: "/reset-password/$step" }) as {
    step?: keyof typeof body;
  };
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
}

export const Route = createFileRoute("/reset-password/$step")({
  component: ResetPasswordComponent,
});
