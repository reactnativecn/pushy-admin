import { manageAppDrawerPlacementPreference } from '@/utils/app-preferences';
import { useStoredPreference } from '@/utils/stored-preference';

/**
 * 管理页应用抽屉的位置：其他组件里改动（自定义事件）和其他标签页改动
 * （storage 事件）都会同步过来。setter 会写入存储并通知所有订阅方。
 */
export function useManageAppDrawerPlacement() {
  const placement = useStoredPreference(manageAppDrawerPlacementPreference);
  return [placement, manageAppDrawerPlacementPreference.set] as const;
}
