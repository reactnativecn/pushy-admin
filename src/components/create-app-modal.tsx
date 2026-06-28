import { Form, Input, Modal, message, Select } from 'antd';
import i18n from '@/i18n';
import { api } from '@/services/api';
import PlatformIcon from './platform-icon';

export const showCreateAppModal = ({
  onCreated,
}: {
  onCreated?: (id: number) => void | Promise<void>;
} = {}) => {
  const t = i18n.t.bind(i18n);
  let name = '';
  let platform = 'android';

  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form initialValues={{ platform }}>
        <br />
        <Form.Item label={t('create_app_modal.app_name')} name="name">
          <Input
            placeholder={t('create_app_modal.app_name_placeholder')}
            onChange={({ target }) => {
              name = target.value;
            }}
          />
        </Form.Item>
        <Form.Item
          label={t('create_app_modal.select_platform')}
          name="platform"
        >
          <Select
            onSelect={(value: string) => {
              platform = value;
            }}
            options={[
              {
                value: 'android',
                label: (
                  <>
                    <PlatformIcon platform="android" className="mr-2" /> Android
                  </>
                ),
              },
              {
                value: 'ios',
                label: (
                  <>
                    <PlatformIcon platform="ios" className="mr-2" /> iOS
                  </>
                ),
              },
              {
                value: 'harmony',
                label: (
                  <>
                    <PlatformIcon platform="harmony" className="mr-[10px]" />
                    HarmonyOS
                  </>
                ),
              },
            ]}
          />
        </Form.Item>
      </Form>
    ),
    async onOk() {
      const trimmedName = name.trim();
      if (!trimmedName) {
        message.warning(t('create_app_modal.app_name_required'));
        return false;
      }

      try {
        const id = await api.createApp({ name: trimmedName, platform });
        if (typeof id === 'number') {
          await onCreated?.(id);
        }
      } catch (error) {
        message.error((error as Error).message);
        return false;
      }
    },
  });
};
