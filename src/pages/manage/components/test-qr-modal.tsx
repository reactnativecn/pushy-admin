import { Checkbox, Input, Modal, QRCode } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEST_QR_CODE_DOC } from '@/constants/links';
import { safeStorage } from '@/utils/storage';
import { useManageContext } from '../hooks/useManageContext';

const DEEP_LINK_EXAMPLE = 'pushy://';

function getDeepLinkError(deepLink: string, t: (key: string) => string) {
  if (!deepLink) {
    return t('version_table.deep_link_required');
  }
  if (/^https?:\/\//i.test(deepLink)) {
    return t('version_table.deep_link_not_url');
  }
  if (/[?#]/.test(deepLink) || !deepLink.endsWith('://')) {
    return t('version_table.deep_link_format');
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\/$/i.test(deepLink)) {
    return t('version_table.deep_link_scheme');
  }
  return '';
}

// 沿用 ManageContext 时期的 key，老用户已存的 deep link 不会丢
const deepLinkStorageKey = (appId: number) => `${appId}_deeplink`;

export const TestQrCodeModal = ({
  open,
  onClose,
  name,
  hash,
}: {
  open: boolean;
  onClose: () => void;
  name?: string;
  hash: string;
}) => {
  const { t } = useTranslation();
  const { appId } = useManageContext();
  // deep link 只有这个弹层用到，状态放本地：每敲一个字只重渲染当前行的二维码，
  // 不再经 ManageContext 波及整张表。各行之间靠 localStorage 共享，弹层打开时回读。
  const [deepLink, setDeepLink] = useState(
    () => safeStorage.get(deepLinkStorageKey(appId)) ?? '',
  );
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);
  const normalizedDeepLink = deepLink.trim();
  const deepLinkError = enableDeepLink
    ? getDeepLinkError(normalizedDeepLink, t)
    : '';

  const isDeepLinkValid = enableDeepLink && !deepLinkError;

  useEffect(() => {
    if (open) {
      const stored = safeStorage.get(deepLinkStorageKey(appId));
      if (stored !== null) {
        setDeepLink(stored);
        setEnableDeepLink(!!stored);
      }
    }
  }, [open, appId]);

  useEffect(() => {
    if (isDeepLinkValid) {
      safeStorage.set(deepLinkStorageKey(appId), normalizedDeepLink);
    }
  }, [appId, isDeepLinkValid, normalizedDeepLink]);

  const codePayload = {
    type: '__rnPushyVersionHash',
    data: hash,
  };
  const codeValue = isDeepLinkValid
    ? `${normalizedDeepLink}?${new URLSearchParams(codePayload).toString()}`
    : JSON.stringify(codePayload);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      maskClosable
      keyboard
      destroyOnClose
      footer={null}
      width={480}
      title={
        <div className="flex items-center justify-between pr-6">
          <span className="font-semibold text-base text-[var(--ant-color-text)]">
            {t('version_table.qr_title')}
          </span>
          <a
            target="_blank"
            className="text-xs text-[var(--ant-color-primary)] hover:underline font-normal"
            href={TEST_QR_CODE_DOC}
            rel="noopener noreferrer"
          >
            {t('version_table.how_to_use')}
          </a>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-[var(--ant-color-border-secondary)]">
          <QRCode
            value={codeValue}
            color="#000000"
            bgColor="#ffffff"
            bordered={false}
            size={180}
          />
        </div>
        {name && (
          <div className="font-medium text-center text-sm text-[var(--ant-color-text)]">
            {name}
          </div>
        )}
        <div className="w-full space-y-3">
          <div className="block text-xs text-center text-[var(--ant-color-text-secondary)]">
            {isDeepLinkValid
              ? t('version_table.qr_pass_hash')
              : enableDeepLink
                ? t('version_table.qr_deep_link_invalid')
                : t('version_table.qr_no_deep_link')}
          </div>
          <Input.TextArea
            readOnly
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={codeValue}
            className="font-mono text-xs"
          />
          <div className="flex flex-col gap-2 rounded bg-[var(--ant-color-fill-quaternary)] border border-[var(--ant-color-border-secondary)] p-3">
            <Checkbox
              checked={enableDeepLink}
              onChange={({ target }) => {
                setEnableDeepLink(target.checked);
              }}
            >
              <span className="text-sm font-medium text-[var(--ant-color-text)]">
                {t('version_table.use_deep_link')}
              </span>
            </Checkbox>
            {enableDeepLink ? (
              <div className="space-y-1 mt-1">
                <div className="text-xs text-[var(--ant-color-text-secondary)]">
                  {t('version_table.deep_link_hint')}
                </div>
                <Input
                  allowClear
                  placeholder={`${DEEP_LINK_EXAMPLE}`}
                  status={deepLinkError ? 'error' : undefined}
                  value={deepLink}
                  onBlur={() => {
                    setDeepLink(normalizedDeepLink);
                  }}
                  onChange={({ target }) => {
                    setDeepLink(target.value);
                  }}
                />
                {deepLinkError ? (
                  <div className="text-xs text-[var(--ant-color-error)]">
                    {deepLinkError}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--ant-color-text-secondary)]">
                    {t('version_table.deep_link_example', {
                      link: normalizedDeepLink,
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};
