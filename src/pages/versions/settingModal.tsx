import { Form, message, Modal, Typography, Switch, Button } from 'antd';
import { DeleteFilled } from '@ant-design/icons';
import { useUserInfo } from '@/utils/hooks';
import request from '@/services/request';
import { rootRouterPath, router } from '@/router';
import { resetAppList } from '@/utils/queryClient';

const SettingModal = ({ app }: { app: App }) => {
  const { user } = useUserInfo();

  function removeApp() {
    Modal.confirm({
      title: '应用删除后无法恢复',
      okText: '确认删除',
      okButtonProps: { danger: true },
      async onOk() {
        await request('delete', `/app/${app.id}`);
        resetAppList();
        router.navigate(rootRouterPath.apps);
      },
    });
  }

  return (
    <Form layout='vertical'>
      <Form.Item label='应用名'>
        <Typography.Paragraph
          type='secondary'
          style={style.item}
          editable={{
            onChange: (value) => (app.name = value),
          }}
        >
          {app.name}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='应用 Key'>
        <Typography.Paragraph style={style.item} type='secondary' copyable>
          {app.appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='下载地址'>
        <Typography.Paragraph
          type='secondary'
          style={style.item}
          editable={{
            onChange: (value) => (app.downloadUrl = value),
          }}
        >
          {app.downloadUrl ?? ''}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='启用热更新'>
        <Switch
          checkedChildren='启用'
          unCheckedChildren='暂停'
          checked={app.status !== 'paused'}
          onChange={(checked) => (app.status = checked ? 'normal' : 'paused')}
        />
      </Form.Item>
      <Form.Item label='忽略编译时间戳（高级版以上可启用）'>
        <Switch
          disabled={
            (user?.tier === 'free' || user?.tier === 'standard') &&
            app.ignoreBuildTime !== 'enabled'
          }
          checkedChildren='启用'
          unCheckedChildren='不启用'
          checked={app.ignoreBuildTime === 'enabled'}
          onChange={(checked) => (app.ignoreBuildTime = checked ? 'enabled' : 'disabled')}
        />
      </Form.Item>
      <Form.Item label='删除应用'>
        <Button type='primary' icon={<DeleteFilled />} onClick={() => removeApp()} danger>
          删除
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SettingModal;

const style: Style = { item: { marginBottom: 0 } };
