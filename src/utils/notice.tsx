import { Modal } from 'antd';

const { confirm } = Modal;

const notices = {
  'v8-deprecation': {
    title: '通知：react-native-update 即将停止支持 v8 以下版本',
    content: (
      <>
        <p>
          从<span style={{ color: '#f50' }}>2025年8月10日</span>起低于 v8
          版本的基准包和热更包将无法上传，请尽快升级到 v8
          及以上版本。已上传的版本不受影响。
        </p>
        <p>跨大版本更新时需要重新打原生包，并请充分测试。</p>
        <p>v5 - v9 版本代码基本兼容，v10 版本代码与之前版本不兼容。</p>
        <p>升级相关的技术问题，请在 QQ 群 729013783 中咨询技术支持。</p>
      </>
    ),
    okText: '我知道了',
    cancelText: '不再显示',
    onCancel: () => {
      localStorage.setItem('v8-deprecation', '1');
    },
  },
};

Object.entries(notices).forEach(([key, value]) => {
  const flag = localStorage.getItem(key);
  if (!flag) {
    confirm(value);
  }
});
