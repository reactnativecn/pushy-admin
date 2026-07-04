import { PullRequestOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import gitUrlParse from 'git-url-parse';
import { useTranslation } from 'react-i18next';
import dayjs from '@/utils/dayjs';

const popoverOverlayStyle: React.CSSProperties = {
  maxWidth: 288,
  maxHeight: 240,
  overflowY: 'auto',
};

export const Commit = ({ commit }: { commit?: Commit }) => {
  const { t } = useTranslation();

  if (!commit) {
    return (
      <Popover
        className="ant-typography-edit"
        overlayInnerStyle={popoverOverlayStyle}
        content={
          <div>
            <div className="text-center my-1 mx-auto">
              <div className="font-bold">{t('commit.title')}:</div>
              <div className="text-gray-500">{t('commit.description')}</div>
            </div>
          </div>
        }
      >
        <Button type="link" icon={<PullRequestOutlined />} onClick={() => {}} />
      </Popover>
    );
  }

  const { origin, hash, message, author } = commit;
  let url = '';
  if (origin) {
    try {
      const { owner, name, source } = gitUrlParse(origin);
      url = `https://${source}/${owner}/${name}/commit/${hash}`;
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

  const time = dayjs(+commit.timestamp * 1000);

  return (
    <Popover
      className="ant-typography-edit"
      overlayInnerStyle={popoverOverlayStyle}
      content={
        <div>
          <div className="my-1 mx-auto">
            <div className="font-bold">{t('commit.title_with_commit')}:</div>
            <div>
              {t('commit.author')}
              {author}
            </div>
            <div>
              {t('commit.time')}
              {time.fromNow()}（{time.format('YYYY-MM-DD HH:mm:ss')}）
            </div>
            <div className="break-all">
              {t('commit.summary')}
              {message}
            </div>
            <hr />
            {url ? (
              <a
                className="text-xs"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hash}
              </a>
            ) : (
              <span className="text-xs">{hash}</span>
            )}
          </div>
        </div>
      }
    >
      <Button type="link" icon={<PullRequestOutlined />} onClick={() => {}} />
    </Popover>
  );
};
