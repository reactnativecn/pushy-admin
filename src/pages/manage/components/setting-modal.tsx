import { Form, Modal, Typography, Switch, Button, Input } from 'antd';
import { DeleteFilled } from '@ant-design/icons';
import { useUserInfo } from '@/utils/hooks';
import { api } from '@/services/api';
import { rootRouterPath, router } from '@/router';
import { useManageContext } from '../hooks/useManageContext';

const SettingModal = () => {
  const { user } = useUserInfo();
  const { appId } = useManageContext();
  const appKey = Form.useWatch('appKey') as string;
  const ignoreBuildTime = Form.useWatch('ignoreBuildTime') as string;

  return (
    <>
      <Form.Item label='AppId' layout='vertical'>
        <Typography.Paragraph className='!mb-0' type='secondary' copyable>
          {appId}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='AppKey' name='appKey' layout='vertical'>
        <Typography.Paragraph className='!mb-0' type='secondary' copyable>
          {appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='应用名' name='name' layout='vertical'>
        <Input />
      </Form.Item>
      <Form.Item label='下载地址' name='downloadUrl' layout='vertical'>
        <Input />
      </Form.Item>
      <Form.Item
        layout='vertical'
        label='启用热更新'
        name='status'
        normalize={(value) => (value ? 'normal' : 'paused')}
        getValueProps={(value) => ({ value: value === 'normal' || value === null })}
      >
        <Switch checkedChildren='已启用' unCheckedChildren='已暂停' />
      </Form.Item>
      <Form.Item
        layout='vertical'
        label='忽略编译时间戳（高级版以上可启用）'
        name='ignoreBuildTime'
        normalize={(value) => (value ? 'enabled' : 'disabled')}
        getValueProps={(value) => ({ value: value === 'enabled' })}
      >
        <Switch
          disabled={
            (user?.tier === 'free' || user?.tier === 'standard') && ignoreBuildTime !== 'enabled'
          }
          checkedChildren='启用'
          unCheckedChildren='不启用'
        />
      </Form.Item>
      <Form.Item label='删除应用' layout='vertical'>
        <Button
          type='primary'
          icon={<DeleteFilled />}
          onClick={() => {
            Modal.confirm({
              title: '应用删除后无法恢复',
              okText: '确认删除',
              okButtonProps: { danger: true },
              async onOk() {
                await api.deleteApp(appId);
                Modal.destroyAll();
                router.navigate(rootRouterPath.apps);
              },
            });
          }}
          danger
        >
          删除
        </Button>
      </Form.Item>
    </>
  );
};

export default SettingModal;
