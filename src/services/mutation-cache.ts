import type { App } from '@/types';

/** 列表接口的缓存形状：{ data: 列表, ...其他字段（如 count） }。 */
export type ListCache<T> = { data?: T[] };

export type AppListCache = ListCache<App>;

type ListItem<C extends ListCache<{ id: number }>> = NonNullable<
  C['data']
>[number];

// 以下更新器都只改已有缓存：列表从没加载过就保持 undefined，不凭空造出半截数据。

/** 按 id 合并更新列表里的一项，其余项和缓存的其他字段原样保留。 */
export const updateItemInList = <C extends ListCache<{ id: number }>>(
  old: C | undefined,
  id: number,
  params: Partial<ListItem<C>>,
): C | undefined =>
  old
    ? {
        ...old,
        data: old.data?.map((item) =>
          item.id === id ? { ...item, ...params } : item,
        ),
      }
    : old;

/** 从列表里移除给定 id 的项。 */
export const removeItemsFromList = <C extends ListCache<{ id: number }>>(
  old: C | undefined,
  ids: Iterable<number>,
): C | undefined => {
  if (!old) {
    return old;
  }
  const idSet = new Set(ids);
  return { ...old, data: old.data?.filter((item) => !idSet.has(item.id)) };
};

/** Apply an update only to an existing detail cache entry. */
export const updateAppDetailCache = (
  old: App | undefined,
  params: Partial<App>,
): App | undefined => (old ? { ...old, ...params } : old);
