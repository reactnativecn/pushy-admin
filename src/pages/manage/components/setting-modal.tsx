import { DeleteFilled } from '@ant-design/icons';
import { Button, Form, Input, Modal, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { rootRouterPath, router } from '@/router';
import { useDeleteApp } from '@/services/mutations';
import { useUserInfo } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';

const SettingModal = () => {
  const { t } = useTranslation();
  const { user } = useUserInfo();
  const { appId } = useManageContext();
  const deleteApp = useDeleteApp();
  const appKey = Form.useWatch('appKey') as string;
  const ignoreBuildTime = Form.useWatch('ignoreBuildTime') as string;

  return (
    <>
      <Form.Item label={t('setting_modal.app_id')} layout="vertical">
        <Typography.Paragraph className="!mb-0" type="secondary" copyable>
          {appId}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item
        label={t('setting_modal.app_key')}
        name="appKey"
        layout="vertical"
      >
        <Typography.Paragraph className="!mb-0" type="secondary" copyable>
          {appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item
        label={t('setting_modal.app_name')}
        name="name"
        layout="vertical"
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={t('setting_modal.download_url')}
        name="downloadUrl"
        layout="vertical"
      >
        <Input />
      </Form.Item>
      <Form.Item
        layout="vertical"
        label={t('setting_modal.hot_updates')}
        name="status"
        normalize={(value) => (value ? 'normal' : 'paused')}
        getValueProps={(value) => ({
          value: value === 'normal' || value === null || value === undefined,
        })}
      >
        <Switch
          checkedChildren={t('setting_modal.enabled')}
          unCheckedChildren={t('setting_modal.paused')}
        />
      </Form.Item>
      <Form.Item
        layout="vertical"
        label={t('setting_modal.ignore_timestamp')}
        name="ignoreBuildTime"
        normalize={(value) => (value ? 'enabled' : 'disabled')}
        getValueProps={(value) => ({ value: value === 'enabled' })}
      >
        <Switch
          disabled={
            (user?.tier === 'free' || user?.tier === 'standard') &&
            ignoreBuildTime !== 'enabled'
          }
          checkedChildren={t('setting_modal.enabled')}
          unCheckedChildren={t('setting_modal.disabled')}
        />
      </Form.Item>
      <Form.Item label={t('setting_modal.delete_app')} layout="vertical">
        <Button
          type="primary"
          icon={<DeleteFilled />}
          onClick={() => {
            Modal.confirm({
              title: t('setting_modal.delete_confirm'),
              okText: t('setting_modal.delete_ok'),
              okButtonProps: { danger: true },
              async onOk() {
                await deleteApp.mutateAsync(appId);
                Modal.destroyAll();
                router.navigate(rootRouterPath.apps);
              },
            });
          }}
          danger
        >
          {t('setting_modal.delete_button')}
        </Button>
      </Form.Item>
    </>
  );
};

export default SettingModal;
