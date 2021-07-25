import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-layout';

const thisYear = new Date().getFullYear();
// TODO 备案
export default () => {
  return (
    <DefaultFooter
      copyright={`${thisYear} 武汉青罗网络科技有限公司`}
      links={[
        {
          key: 'pushy',
          title: 'Pushy 热更新',
          href: 'https://pushy.reactnative.cn',
          blankTarget: true,
        },
        {
          key: 'github',
          title: <GithubOutlined />,
          href: 'https://github.com/reactnativecn/react-native-pushy',
          blankTarget: true,
        },
        {
          key: 'rncn',
          title: 'React Native 中文网',
          href: 'https://pushy.reactnative.cn',
          blankTarget: true,
        },
      ]}
    />
  );
};
