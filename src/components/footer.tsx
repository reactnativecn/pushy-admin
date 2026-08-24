import { useQuery } from '@tanstack/react-query';
import { Layout, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { serverKeys } from '@/utils/query-keys';

// 界面版本在打包时写死（见 rsbuild.config.ts），后端版本运行时问 /status。
const uiVersion = process.env.PUBLIC_UI_VERSION ?? 'dev';

const Footer = () => {
  const { t } = useTranslation();
  // 版本号不会在页面开着的时候变，拿一次就够；拿不到也不重试、不报错。
  const { data: status } = useQuery({
    queryKey: serverKeys.status(),
    queryFn: api.serverStatus,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  // 没被 ldflags 打过版本号的构建（本地跑起来的后端）报的是 "unknown"，那不是
  // 一个版本号，印出来只会让人以为发布流程坏了。
  const engine =
    status?.version && status.version !== 'unknown' ? status.version : '';
  return (
    <Layout.Footer className="shrink-0 text-center">
      <Typography.Paragraph type="secondary">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </Typography.Paragraph>
      <Typography.Paragraph className="flex flex-wrap items-center justify-center gap-2">
        <a href="http://beian.miit.gov.cn/">鄂ICP备20002031号-3</a>
        <img
          className="h-6 my-0 mx-1"
          src="https://img.alicdn.com/tfs/TB1..50QpXXXXX7XpXXXXXXXXXX-40-40.png"
          alt="鄂公网安备 42011202001821号"
        />
        <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=42011202001821">
          鄂公网安备 42011202001821号
        </a>
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" className="text-xs">
        {engine ? `engine: ${engine} · ` : ''}
        {`ui: ${uiVersion}`}
      </Typography.Paragraph>
    </Layout.Footer>
  );
};
export default Footer;
