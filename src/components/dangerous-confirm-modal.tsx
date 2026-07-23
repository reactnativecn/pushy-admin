import { ExclamationCircleFilled } from '@ant-design/icons';
import { Alert, Input, Modal, Typography } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';

const { Text } = Typography;

export interface DangerousConfirmModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  expectedConfirmText?: string;
  confirmPlaceholder?: string;
  dangerButtonText?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * 高危毁灭性操作二次确认 Guard 弹窗组件
 * 当配置了 expectedConfirmText 时，用户必须在输入框中输入匹配的文本方可点击确认。
 */
export function DangerousConfirmModal({
  open,
  title,
  description,
  expectedConfirmText,
  confirmPlaceholder = '请输入对应的确认名称以继续',
  dangerButtonText = '确认执行',
  loading = false,
  onCancel,
  onConfirm,
}: DangerousConfirmModalProps) {
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
      okText={dangerButtonText}
      okButtonProps={{
        danger: true,
        type: 'primary',
        disabled: !isMatched,
        loading,
      }}
      cancelText="取消"
      destroyOnClose
    >
      <Alert
        type="warning"
        showIcon
        message="高风险操作提示"
        description={description}
        style={{ marginBottom: 16, marginTop: 12 }}
      />

      {expectedConfirmText && (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 8, fontSize: 13 }}>
            为防止误操作，请输入提示文本{' '}
            <Text code copyable>
              {expectedConfirmText}
            </Text>{' '}
            以进行确认：
          </p>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={confirmPlaceholder}
            status={inputText && !isMatched ? 'error' : ''}
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
