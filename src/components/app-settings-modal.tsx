import { DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Spin,
  Switch,
  Typography,
} from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import type { App } from '@/types';
import { useUserInfo } from '@/utils/hooks';

export interface AppSettingsTarget {
  id: number;
  name?: string;
  appKey?: string | null;
  downloadUrl?: string | null;
  status?: string | null;
  ignoreBuildTime?: 'enabled' | 'disabled' | null;
}

type AppSettingsFormValues = Pick<
  App,
  'appKey' | 'downloadUrl' | 'ignoreBuildTime' | 'name' | 'status'
>;

export function useAppSettingsModal() {
  const { t } = useTranslation();
  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm<AppSettingsFormValues>();
  const screens = Grid.useBreakpoint();

  const openAppSettings = (app: AppSettingsTarget) => {
    form.resetFields();
    form.setFieldsValue(normalizeAppSettings(app));
    modal.confirm({
      title: t('app_settings_modal.title'),
      icon: null,
      closable: true,
      maskClosable: true,
      width: !screens.md ? 'calc(100vw - 32px)' : 520,
      content: (
        <AppSettingsModalContent appId={app.id} form={form} initialApp={app} />
      ),
      async onOk() {
        try {
          const values = form.getFieldsValue();
          await api.updateApp(app.id, {
            name: values.name,
            downloadUrl: values.downloadUrl,
            status: values.status,
            ignoreBuildTime: values.ignoreBuildTime,
          });
        } catch (error) {
          message.error((error as Error).message);
          return Promise.reject(error);
        }
        message.success(t('app_settings_modal.updated'));
      },
    });
  };

  return { contextHolder, openAppSettings };
}

function AppSettingsModalContent({
  appId,
  form,
  initialApp,
}: {
  appId: number;
  form: ReturnType<typeof Form.useForm<AppSettingsFormValues>>[0];
  initialApp: AppSettingsTarget;
}) {
  const { t } = useTranslation();
  const { user } = useUserInfo();
  const { data: app, isLoading } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => api.getApp(appId),
  });
  const appKey = Form.useWatch('appKey', form) as string;
  const ignoreBuildTime = Form.useWatch('ignoreBuildTime', form) as string;

  useEffect(() => {
    if (app) {
      form.setFieldsValue(normalizeAppSettings(app));
    }
  }, [app, form]);

  return (
    <Spin spinning={isLoading}>
      <Form
        layout="vertical"
        form={form}
        initialValues={normalizeAppSettings(initialApp)}
      >
        <Form.Item label={t('app_settings_modal.app_id')} layout="vertical">
          <Typography.Paragraph className="!mb-0" type="secondary" copyable>
            {appId}
          </Typography.Paragraph>
        </Form.Item>
        <Form.Item
          label={t('app_settings_modal.app_key')}
          name="appKey"
          layout="vertical"
        >
          <Typography.Paragraph className="!mb-0" type="secondary" copyable>
            {appKey}
          </Typography.Paragraph>
        </Form.Item>
        <Form.Item
          label={t('app_settings_modal.app_name')}
          name="name"
          layout="vertical"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('app_settings_modal.download_url')}
          name="downloadUrl"
          layout="vertical"
        >
          <Input />
        </Form.Item>
        <Form.Item
          layout="vertical"
          label={t('app_settings_modal.hot_updates')}
          name="status"
          normalize={(value) => (value ? 'normal' : 'paused')}
          getValueProps={(value) => ({
            value: value === 'normal' || value === null || value === undefined,
          })}
        >
          <Switch
            checkedChildren={t('app_settings_modal.enabled')}
            unCheckedChildren={t('app_settings_modal.paused')}
          />
        </Form.Item>
        <Form.Item
          layout="vertical"
          label={t('app_settings_modal.ignore_timestamp')}
          name="ignoreBuildTime"
          normalize={(value) => (value ? 'enabled' : 'disabled')}
          getValueProps={(value) => ({ value: value === 'enabled' })}
        >
          <Switch
            disabled={
              (user?.tier === 'free' || user?.tier === 'standard') &&
              ignoreBuildTime !== 'enabled'
            }
            checkedChildren={t('app_settings_modal.enabled')}
            unCheckedChildren={t('app_settings_modal.disabled')}
          />
        </Form.Item>
        <Form.Item label={t('app_settings_modal.delete_app')} layout="vertical">
          <Button
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: t('app_settings_modal.delete_confirm'),
                okText: t('app_settings_modal.delete_ok'),
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
            {t('app_settings_modal.delete_button')}
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
}

function normalizeAppSettings(app: AppSettingsTarget): AppSettingsFormValues {
  return {
    appKey: app.appKey ?? undefined,
    downloadUrl: app.downloadUrl ?? undefined,
    ignoreBuildTime: app.ignoreBuildTime ?? undefined,
    name: app.name ?? '',
    status: app.status === 'paused' ? 'paused' : 'normal',
  };
}
