import { DownOutlined } from '@ant-design/icons';
import { Button, Popover, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/helper';

export const purchaseButtonClassName = 'w-full justify-center sm:w-[160px]';

/**
 * 记录正在执行的操作 key（如正在跳转支付的套餐）：执行期间 runningKey 为该 key，
 * 结束（无论成败）后清空。
 */
export function useRunningKey<K>() {
  const [runningKey, setRunningKey] = useState<K | null>(null);
  const run = async (key: K, task: () => Promise<void>) => {
    setRunningKey(key);
    try {
      await task();
    } finally {
      setRunningKey(null);
    }
  };
  return { run, runningKey };
}

export type PurchaseMenuOption = {
  amountText: string;
  bonusTag?: string;
  description?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  disabled?: boolean;
  formula?: string;
  key: string;
  onClick?: () => Promise<void>;
  tag?: string;
  title: string;
};

export function PurchaseActionPopover({
  buttonLabel,
  emptyText,
  headerContent,
  hint,
  loading,
  title,
  titleNote,
  widthClassName = 'w-[340px]',
  options,
}: {
  buttonLabel: string;
  emptyText?: string;
  headerContent?: React.ReactNode;
  hint?: string;
  loading: boolean;
  title?: string;
  titleNote?: string;
  widthClassName?: string;
  options: PurchaseMenuOption[];
}) {
  const { t } = useTranslation();
  const resolvedEmptyText = emptyText ?? t('user.addon_empty');

  const content = (
    <div
      className={cn(
        'max-h-[70vh] max-w-[calc(100vw-32px)] overflow-y-auto pr-1',
        widthClassName,
      )}
    >
      {title && (
        <div className="px-2">
          <div className="font-semibold text-slate-900 text-sm">{title}</div>
          {titleNote && (
            <div className="mt-0.5 text-slate-500 text-xs">{titleNote}</div>
          )}
        </div>
      )}
      {hint && (
        <div className="px-2 pt-1 pb-2 text-slate-500 text-xs leading-relaxed">
          {hint}
        </div>
      )}
      {headerContent}
      <div className="flex flex-col gap-1">
        {options.length > 0 ? (
          options.map((option) => (
            <button
              className={cn(
                'w-full rounded border border-transparent px-3 py-2 text-left transition',
                option.disabled || loading
                  ? 'cursor-not-allowed text-slate-400'
                  : 'cursor-pointer hover:border-blue-200 hover:bg-blue-50',
              )}
              disabled={option.disabled || loading}
              key={option.key}
              onClick={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await option.onClick?.();
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span
                  className={cn(
                    'font-medium',
                    option.disabled || loading
                      ? 'text-slate-400'
                      : 'text-slate-900',
                  )}
                >
                  {option.title}
                </span>
                <span
                  className={cn(
                    'min-w-0 text-right font-semibold',
                    option.disabled || loading
                      ? 'text-slate-400'
                      : 'text-slate-900',
                  )}
                >
                  {option.amountText}
                </span>
              </div>
              {(option.description || option.tag || option.bonusTag) && (
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                  {option.description && (
                    <span className="text-slate-500">{option.description}</span>
                  )}
                  {option.tag && (
                    <Tag color="gold" className="m-0">
                      {option.tag}
                    </Tag>
                  )}
                  {option.bonusTag && (
                    <Tag color="magenta" className="m-0 font-semibold">
                      🎁 {option.bonusTag}
                    </Tag>
                  )}
                </div>
              )}
              {option.details && (
                <div
                  className={cn(
                    'mt-2 grid gap-1.5',
                    option.details.length >= 4 ? 'grid-cols-4' : 'grid-cols-3',
                  )}
                >
                  {option.details.map((detail) => (
                    <div
                      className="rounded bg-slate-50 px-2 py-1"
                      key={detail.label}
                    >
                      <div className="text-[10px] text-slate-400">
                        {detail.label}
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 truncate font-semibold text-sm tabular-nums',
                          option.disabled || loading
                            ? 'text-slate-400'
                            : 'text-primary',
                        )}
                      >
                        {detail.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {option.formula && (
                <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500 tabular-nums">
                  {option.formula}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="px-2 py-3 text-center text-slate-500 text-xs">
            {resolvedEmptyText}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      placement="bottomLeft"
      trigger={['hover', 'click']}
    >
      <Button className={purchaseButtonClassName} loading={loading}>
        <span className="inline-flex items-center gap-2">
          {buttonLabel}
          <DownOutlined className="text-[10px]" />
        </span>
      </Button>
    </Popover>
  );
}
