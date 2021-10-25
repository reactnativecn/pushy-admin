import { Layout, Typography } from "antd";

export default () => (
  <Layout.Footer style={style.footer}>
    <Typography.Paragraph type="secondary">
      React Native中文网 © {new Date().getFullYear()} 武汉青罗网络科技有限公司
    </Typography.Paragraph>
    <Typography.Paragraph>
      <a href="http://beian.miit.gov.cn/">鄂ICP备20002031号-3</a>
      <img
        style={{ height: 24, margin: "0 4px" }}
        src="https://img.alicdn.com/tfs/TB1..50QpXXXXX7XpXXXXXXXXXX-40-40.png"
        alt="鄂公网安备 42011202001821号"
      />
      <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=42011202001821">
        鄂公网安备 42011202001821号
      </a>
    </Typography.Paragraph>
  </Layout.Footer>
);

const style: Style = {
  footer: { textAlign: "center", paddingBottom: 0, background: "none" },
};
