import { Layout, Typography } from 'antd';

const Footer = () => (
  <Layout.Footer className="text-center">
    <Typography.Paragraph type="secondary">
      React Native 中文网 © {new Date().getFullYear()} 武汉青罗网络科技有限公司
    </Typography.Paragraph>
    <Typography.Paragraph className="flex items-center justify-center">
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
  </Layout.Footer>
);
export default Footer;
