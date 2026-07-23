import { ExclamationCircleFilled } from '@ant-design/icons';
import { Alert, Input, Modal, Typography } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export interface DangerousConfirmModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  expectedConfirmText?: string;
  confirmPlaceholder?: string;
  dangerButtonText?: string;
  cancelButtonText?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * 高危毁灭性操作二次确认 Guard 弹窗组件
 * 当配置了 expectedConfirmText 时，用户必须在输入框中手动键入完全匹配的文本方可点击确认。
 */
export function DangerousConfirmModal({
  open,
  title,
  description,
  expectedConfirmText,
  confirmPlaceholder,
  dangerButtonText,
  cancelButtonText,
  loading = false,
  onCancel,
  onConfirm,
}: DangerousConfirmModalProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');

  // 重置输入状态
  useEffect(() => {
    if (open) {
      setInputText('');
    }
  }, [open]);

  const hasExpectedText =
    expectedConfirmText !== undefined && expectedConfirmText !== null;
  const isMatched = hasExpectedText
    ? expectedConfirmText.trim() !== '' &&
      inputText.trim() === expectedConfirmText.trim()
    : true;

  const placeholderText =
    confirmPlaceholder ?? t('dangerous_modal.confirm_placeholder');
  const okText = dangerButtonText ?? t('dangerous_modal.confirm_button');
  const cancelText = cancelButtonText ?? t('dangerous_modal.cancel');

  return (
    <Modal
      open={open}
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#ff4d4f',
          }}
        >
          <ExclamationCircleFilled style={{ fontSize: 20 }} />
          <span>{title}</span>
        </div>
      }
      onCancel={onCancel}
      onOk={onConfirm}
      okText={okText}
      okButtonProps={{
        danger: true,
        type: 'primary',
        disabled: !isMatched,
        loading,
      }}
      cancelText={cancelText}
      destroyOnHidden
    >
      <Alert
        type="warning"
        showIcon
        title={t('dangerous_modal.warning_title')}
        description={description}
        style={{ marginBottom: 16, marginTop: 12 }}
      />

      {expectedConfirmText && (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 8, fontSize: 13 }}>
            {t('dangerous_modal.confirm_prompt_prefix')}{' '}
            <Text code>{expectedConfirmText}</Text>{' '}
            {t('dangerous_modal.confirm_prompt_suffix')}
          </p>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={placeholderText}
            status={inputText && !isMatched ? 'error' : ''}
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
