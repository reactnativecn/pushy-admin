import { Form, Modal, Typography, Switch, Button, Input } from 'antd';
import { DeleteFilled } from '@ant-design/icons';
import { useUserInfo } from '@/utils/hooks';
import { api } from '@/services/api';
import { rootRouterPath, router } from '@/router';

const SettingModal = () => {
  const { user } = useUserInfo();
  const [form] = Form.useForm();

  return (
    <>
      <Form.Item label='应用名' name='name'>
        <Input />
      </Form.Item>
      <Form.Item label='应用 Key' name='appKey'>
        <Typography.Paragraph style={style.item} type='secondary' copyable>
          {form.getFieldValue('appKey')}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='下载地址' name='downloadUrl'>
        <Input />
      </Form.Item>
      <Form.Item
        label='启用热更新'
        name='status'
        normalize={(value) => (value === 'normal' ? 'normal' : 'paused')}
        getValueProps={(value) => ({ checked: value === 'normal' })}
      >
        <Switch checkedChildren='启用' unCheckedChildren='暂停' />
      </Form.Item>
      <Form.Item
        label='忽略编译时间戳（高级版以上可启用）'
        name='ignoreBuildTime'
        normalize={(value) => (value === 'enabled' ? 'enabled' : 'disabled')}
        getValueProps={(value) => ({ checked: value === 'enabled' })}
      >
        <Switch
          disabled={
            (user?.tier === 'free' || user?.tier === 'standard') &&
            form.getFieldValue('ignoreBuildTime') !== 'enabled'
          }
          checkedChildren='启用'
          unCheckedChildren='不启用'
        />
      </Form.Item>
      <Form.Item label='删除应用'>
        <Button
          type='primary'
          icon={<DeleteFilled />}
          onClick={() => {
            Modal.confirm({
              title: '应用删除后无法恢复',
              okText: '确认删除',
              okButtonProps: { danger: true },
              async onOk() {
                await api.deleteApp(Number(form.getFieldValue('id')));
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

const style: Style = { item: { marginBottom: 0 } };
