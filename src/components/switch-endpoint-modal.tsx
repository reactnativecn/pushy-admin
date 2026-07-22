import { Button, Form, Input, Modal, message, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  setCustomBaseUrl,
  testEndpointStatus,
  useCustomBaseUrl,
} from '@/utils/endpoint';

interface SwitchEndpointModalProps {
  onClose: () => void;
  open: boolean;
}

export function SwitchEndpointModal({
  onClose,
  open,
}: SwitchEndpointModalProps) {
  const { t } = useTranslation();
  const currentCustomUrl = useCustomBaseUrl();
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      setUrlInput(currentCustomUrl ?? '');
    }
  }, [open, currentCustomUrl]);

  const handleSave = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      handleReset();
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      message.error(t('admin_endpoint.invalid_url'));
      return;
    }

    setTesting(true);
    try {
      const ok = await testEndpointStatus(trimmed);
      if (ok) {
        setCustomBaseUrl(trimmed);
        message.success(t('admin_endpoint.test_success'));
        onClose();
      } else {
        message.error(t('admin_endpoint.test_failed'));
      }
    } catch {
      message.error(t('admin_endpoint.test_failed'));
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => {
    setCustomBaseUrl(null);
    setUrlInput('');
    message.success(t('admin_endpoint.reset_success'));
    onClose();
  };

  return (
    <Modal
      footer={null}
      onCancel={onClose}
      open={open}
      title={t('admin_endpoint.title')}
    >
      <div className="py-2">
        <Form layout="vertical">
          <Form.Item
            label={t('admin_endpoint.base_url_label')}
            help={
              currentCustomUrl ? (
                <div className="mt-1 flex items-center gap-1">
                  <span>{t('admin_endpoint.current_custom')}:</span>
                  <Tag color="processing">{currentCustomUrl}</Tag>
                </div>
              ) : (
                <span className="text-gray-400">
                  {t('admin_endpoint.using_default')}
                </span>
              )
            }
          >
            <Input
              allowClear
              disabled={testing}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t('admin_endpoint.base_url_placeholder')}
              value={urlInput}
            />
          </Form.Item>

          <div className="flex items-center justify-end gap-2 pt-2">
            {currentCustomUrl && (
              <Button disabled={testing} onClick={handleReset}>
                {t('admin_endpoint.reset_default')}
              </Button>
            )}
            <Button onClick={onClose}>{t('common.cancel', '取消')}</Button>
            <Button loading={testing} type="primary" onClick={handleSave}>
              {t('admin_endpoint.test_and_save')}
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
