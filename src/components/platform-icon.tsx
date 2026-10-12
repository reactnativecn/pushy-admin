import {
  AndroidFilled,
  AppleFilled,
  HarmonyOSOutlined,
} from '@ant-design/icons';
import type { App } from '@/types';
import { cn } from '@/utils/helper';

export const PLATFORM_LABELS: Record<App['platform'], string> = {
  ios: 'iOS',
  android: 'Android',
  harmony: 'HarmonyOS',
};

/** 表格筛选、下拉选择用的平台选项，顺序与 PLATFORM_LABELS 一致。 */
export const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export default function PlatformIcon({
  platform,
  className,
}: {
  platform?: 'android' | 'ios' | 'harmony';
  className?: string;
}) {
  if (!platform) {
    return null;
  }
  if (platform === 'android') {
    return <AndroidFilled className={cn('text-[#3ddc84]!', className)} />;
  }
  if (platform === 'ios') {
    return <AppleFilled className={cn('text-[#a6b1b7]!', className)} />;
  }
  return <HarmonyOSOutlined className={cn('text-[#a6b1b7]!', className)} />;
}
