import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Modal, message, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile, useModalWidth } from '@/utils/responsive';

const { Paragraph } = Typography;

export interface NewTokenRevealModalProps {
  /** 明文 token；为空即关闭弹窗 */
  token: string | null;
  onClose: () => void;
  /** 桌面端宽度，移动端自动铺满 */
  width: number;
  title: string;
  okText: string;
  warning: string;
  copyText: string;
  copiedText: string;
  /** 复制按钮之后的补充内容（如 MCP 客户端配置示例） */
  children?: ReactNode;
}

/**
 * 「明文只展示一次」的 token 弹窗：API Key 与 MCP 连接创建后共用。
 * 文案由调用方按各自命名空间翻译后传入，避免动态拼 i18n key。
 */
export function NewTokenRevealModal({
  token,
  onClose,
  width,
  title,
  okText,
  warning,
  copyText,
  copiedText,
  children,
}: NewTokenRevealModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const modalWidth = useModalWidth(width);

  const copyToken = async () => {
    if (!token) {
      return;
    }
    // 剪贴板写入可能被拒（页面失焦、权限、非安全上下文），写成功了再提示
    try {
      await navigator.clipboard.writeText(token);
      message.success(copiedText);
    } catch {
      message.error(t('common.copy_failed'));
    }
  };

  return (
    <Modal
      title={title}
      open={!!token}
      width={modalWidth}
      onOk={onClose}
      onCancel={onClose}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText={okText}
    >
      <div className="my-4">
        <Paragraph type="warning" className="mb-2">
          {warning}
        </Paragraph>
        <Input.TextArea
          value={token || ''}
          readOnly
          autoSize={{ minRows: 2 }}
          className="font-mono"
        />
        <Button
          icon={<CopyOutlined />}
          className="mt-2 w-full sm:w-auto"
          block={isMobile}
          onClick={copyToken}
        >
          {copyText}
        </Button>
        {children}
      </div>
    </Modal>
  );
}
