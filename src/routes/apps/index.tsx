import { createFileRoute } from '@tanstack/react-router';
import { Alert } from 'antd';

function AppsIndexComponent() {
  return <Alert message="请选择应用" showIcon />;
}

export const Route = createFileRoute('/apps/')({
  component: AppsIndexComponent,
});
