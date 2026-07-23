import { DeleteFilled } from '@ant-design/icons';
import { Button, Form, Input, Switch, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DangerousConfirmModal } from '@/components/dangerous-confirm-modal';
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
  const appName = Form.useWatch('name') as string;
  const ignoreBuildTime = Form.useWatch('ignoreBuildTime') as string;
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 优先使用 appName，如尚未设定或加载中时使用稳定的 appKey 作为二次确认识别串
  const confirmTargetText = appName?.trim() || appKey?.trim() || '';

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
          onClick={() => setShowConfirmModal(true)}
          danger
        >
          {t('setting_modal.delete_button')}
        </Button>
      </Form.Item>

      <DangerousConfirmModal
        open={showConfirmModal}
        title={t('setting_modal.delete_title')}
        description={t('setting_modal.delete_desc')}
        expectedConfirmText={confirmTargetText}
        dangerButtonText={t('setting_modal.delete_permanent')}
        loading={deleteApp.isPending}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={async () => {
          await deleteApp.mutateAsync(appId);
          setShowConfirmModal(false);
          router.navigate(rootRouterPath.apps);
        }}
      />
    </>
  );
};

export default SettingModal;
