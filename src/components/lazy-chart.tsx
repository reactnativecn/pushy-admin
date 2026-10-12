import type { Column, Line } from '@ant-design/plots';
import {
  type ComponentProps,
  type ComponentType,
  lazy,
  Suspense,
  useCallback,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { SectionErrorBoundary } from './section-error-boundary';
import { ChartSkeleton } from './skeletons';

type ChartComponentType = 'Line' | 'Column';

// 只从 @ant-design/plots 取用，并且每种图表用静态属性名挑导出：
// @ant-design/charts 只是 `export * from graphs/plots` 的壳，动态 `module[type]`
// 会让打包器放弃摇树，把整个 G6 图库（约 780KB）一起打进来。
const chartLoaders: Record<
  ChartComponentType,
  () => Promise<{ default: ComponentType<any> }>
> = {
  Line: () =>
    import('@ant-design/plots').then((m) => ({
      default: m.Line as ComponentType<any>,
    })),
  Column: () =>
    import('@ant-design/plots').then((m) => ({
      default: m.Column as ComponentType<any>,
    })),
};

function createLazyChart(type: ChartComponentType) {
  return lazy(chartLoaders[type]);
}

interface AsyncChartProps<T extends ChartComponentType> {
  chartType: T;
  errorTitle: string;
  height?: number;
  chartProps: Record<string, any>;
}

function AsyncChartWrapper<T extends ChartComponentType>({
  chartType,
  errorTitle,
  height,
  chartProps,
}: AsyncChartProps<T>) {
  const [retryCount, setRetryCount] = useState(0);
  const [LazyComponent, setLazyComponent] = useState(() =>
    createLazyChart(chartType),
  );

  const handleReset = useCallback(() => {
    setLazyComponent(() => createLazyChart(chartType));
    setRetryCount((c) => c + 1);
  }, [chartType]);

  return (
    <SectionErrorBoundary title={errorTitle} onReset={handleReset}>
      <Suspense
        key={retryCount}
        fallback={<ChartSkeleton height={height || 300} />}
      >
        <LazyComponent {...chartProps} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

export function AsyncLine({
  height,
  ...props
}: ComponentProps<typeof Line> & { height?: number }) {
  const { t } = useTranslation();
  return (
    <AsyncChartWrapper
      chartType="Line"
      errorTitle={t('error_boundary.line_chart_error')}
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncColumn({
  height,
  ...props
}: ComponentProps<typeof Column> & { height?: number }) {
  const { t } = useTranslation();
  return (
    <AsyncChartWrapper
      chartType="Column"
      errorTitle={t('error_boundary.chart_error')}
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}
