import {
  type ComponentProps,
  type ComponentType,
  lazy,
  Suspense,
  useCallback,
  useState,
} from 'react';
import { SectionErrorBoundary } from './section-error-boundary';
import { ChartSkeleton } from './skeletons';

type ChartComponentType = 'Area' | 'Line' | 'Pie' | 'DualAxes';

function createLazyChart<T extends ChartComponentType>(type: T) {
  return lazy(() =>
    import('@ant-design/charts').then((module) => ({
      default: module[type] as ComponentType<any>,
    })),
  );
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

export function AsyncArea({
  height,
  ...props
}: ComponentProps<typeof import('@ant-design/charts')['Area']> & {
  height?: number;
}) {
  return (
    <AsyncChartWrapper
      chartType="Area"
      errorTitle="图表渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncLine({
  height,
  ...props
}: ComponentProps<typeof import('@ant-design/charts')['Line']> & {
  height?: number;
}) {
  return (
    <AsyncChartWrapper
      chartType="Line"
      errorTitle="折线图渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncPie({
  height,
  ...props
}: ComponentProps<typeof import('@ant-design/charts')['Pie']> & {
  height?: number;
}) {
  return (
    <AsyncChartWrapper
      chartType="Pie"
      errorTitle="饼图渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}

export function AsyncDualAxes({
  height,
  ...props
}: ComponentProps<typeof import('@ant-design/charts')['DualAxes']> & {
  height?: number;
}) {
  return (
    <AsyncChartWrapper
      chartType="DualAxes"
      errorTitle="双轴图表渲染异常"
      height={height}
      chartProps={{ ...props, height }}
    />
  );
}
