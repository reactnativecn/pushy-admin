import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import { useTranslation } from 'react-i18next';

export const IgnoreCheckHelp = () => {
  const { t } = useTranslation();
  return (
    <Popover
      trigger="hover"
      content={
        <div className="max-w-72 text-xs leading-5">
          <div>{t('ignore_check_help.what')}</div>
          <div className="mt-2">{t('ignore_check_help.side_effect')}</div>
          <div className="mt-2">{t('ignore_check_help.tier')}</div>
        </div>
      }
    >
      <QuestionCircleOutlined className="ml-1 cursor-help text-gray-400" />
    </Popover>
  );
};
