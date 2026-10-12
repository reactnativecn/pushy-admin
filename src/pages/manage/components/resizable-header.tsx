import { type ComponentProps, useState } from 'react';
import { safeStorage } from '@/utils/storage';

interface ResizableHeaderCellProps extends ComponentProps<'th'> {
  width?: number;
  minWidth?: number;
  onResize?: (width: number) => void;
}

export const ResizableHeaderCell = ({
  width,
  minWidth = 100,
  onResize,
  children,
  className,
  ...restProps
}: ResizableHeaderCellProps) => {
  const [isResizing, setIsResizing] = useState(false);

  if (!width || !onResize) {
    return (
      <th className={className} {...restProps}>
        {children}
      </th>
    );
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(minWidth, startWidth + deltaX);
      onResize(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th
      className={`relative select-none ${className || ''}`}
      style={{ width }}
      {...restProps}
    >
      {children}
      <span
        role="slider"
        aria-orientation="vertical"
        aria-label="Resize column"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={1000}
        tabIndex={0}
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-[var(--ant-color-primary)] active:bg-[var(--ant-color-primary)] transition-colors ${
          isResizing ? 'bg-[var(--ant-color-primary)]' : ''
        }`}
        onMouseDown={handleMouseDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            onResize(Math.max(minWidth, width - 10));
          } else if (e.key === 'ArrowRight') {
            onResize(width + 10);
          }
        }}
      />
    </th>
  );
};

// 版本表可拖拽列的默认宽度；用户拖过的宽度按列存在 localStorage
export const DEFAULT_COLUMN_WIDTHS = {
  name: 160,
  description: 220,
  metaInfo: 140,
  createdAt: 160,
};

export type ColumnWidths = typeof DEFAULT_COLUMN_WIDTHS;

export type ResizableColumnKey = keyof ColumnWidths;

const columnWidthStorageKey = (key: ResizableColumnKey) =>
  `version_table_col_w_${key}`;

export const getStoredWidth = (key: ResizableColumnKey) => {
  const val = Number(safeStorage.get(columnWidthStorageKey(key)));
  return val > 0 ? val : DEFAULT_COLUMN_WIDTHS[key];
};

export const storeColumnWidth = (key: ResizableColumnKey, width: number) => {
  safeStorage.set(columnWidthStorageKey(key), String(width));
};
