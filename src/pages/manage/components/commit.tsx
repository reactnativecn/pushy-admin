import { PullRequestOutlined } from '@ant-design/icons';
import { Button, Modal } from 'antd';
import gitUrlParse from 'git-url-parse';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Commit as CommitType } from '@/types';
import dayjs from '@/utils/dayjs';

export const CommitModal = ({
  open,
  onClose,
  commit,
}: {
  open: boolean;
  onClose: () => void;
  commit?: CommitType;
}) => {
  const { t } = useTranslation();

  let url = '';
  if (commit?.origin) {
    try {
      const { owner, name, source } = gitUrlParse(commit.origin);
      url = `https://${source}/${owner}/${name}/commit/${commit.hash}`;
    } catch (error) {
      console.error(error);
    }
  }

  // Validate URL protocol to prevent XSS
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        url = '';
      }
    } catch {
      url = '';
    }
  }

  const time = commit?.timestamp ? dayjs(+commit.timestamp * 1000) : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      maskClosable
      keyboard
      destroyOnClose
      footer={null}
      width={540}
      title={
        <span className="font-semibold text-base text-[var(--ant-color-text)]">
          {t('commit.title')}
        </span>
      }
    >
      {!commit ? (
        <div className="py-8 text-center text-sm text-[var(--ant-color-text-secondary)]">
          {t('commit.description')}
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-3.5 py-2 pr-1 text-sm text-[var(--ant-color-text)]">
          <div className="flex items-baseline gap-2">
            <span className="w-16 shrink-0 font-medium text-[var(--ant-color-text-secondary)]">
              {t('commit.author')}
            </span>
            <span className="font-mono text-[var(--ant-color-text)]">
              {commit.author}
            </span>
          </div>
          {time && (
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 font-medium text-[var(--ant-color-text-secondary)]">
                {t('commit.time')}
              </span>
              <span className="text-[var(--ant-color-text)]">
                {time.fromNow()}（{time.format('YYYY-MM-DD HH:mm:ss')}）
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-[var(--ant-color-text-secondary)]">
              {t('commit.summary')}
            </span>
            <div className="max-h-52 overflow-y-auto whitespace-pre-wrap break-all rounded bg-[var(--ant-color-fill-quaternary)] border border-[var(--ant-color-border-secondary)] p-3 font-mono text-xs text-[var(--ant-color-text)] leading-relaxed">
              {commit.message}
            </div>
          </div>
          <div className="border-t border-[var(--ant-color-border-secondary)] pt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--ant-color-text-tertiary)]">
              Git Commit
            </span>
            {url ? (
              <a
                className="font-mono text-xs text-[var(--ant-color-primary)] hover:underline"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {commit.hash}
              </a>
            ) : (
              <span className="font-mono text-xs text-[var(--ant-color-text)]">
                {commit.hash}
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const Commit = ({ commit }: { commit?: CommitType }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="link"
        icon={<PullRequestOutlined />}
        onClick={() => setOpen(true)}
      />
      <CommitModal open={open} onClose={() => setOpen(false)} commit={commit} />
    </>
  );
};
