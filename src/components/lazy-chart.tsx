import { type ComponentProps, lazy, Suspense } from 'react';
import { SectionErrorBoundary } from './section-error-boundary';
import { ChartSkeleton } from './skeletons';

// 动态按需加载 @ant-design/charts，隔离打包 Chunk
const LazyArea = lazy(() =>
  import('@ant-design/charts').then((module) => ({ default: module.Area })),
);

const LazyLine = lazy(() =>
  import('@ant-design/charts').then((module) => ({ default: module.Line })),
);

const LazyPie = lazy(() =>
  import('@ant-design/charts').then((module) => ({ default: module.Pie })),
);

const LazyDualAxes = lazy(() =>
  import('@ant-design/charts').then((module) => ({ default: module.DualAxes })),
);

export function AsyncArea(
  props: ComponentProps<typeof LazyArea> & { height?: number },
) {
  return (
    <SectionErrorBoundary title="图表渲染异常">
      <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyArea {...props} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

export function AsyncLine(
  props: ComponentProps<typeof LazyLine> & { height?: number },
) {
  return (
    <SectionErrorBoundary title="折线图渲染异常">
      <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyLine {...props} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

export function AsyncPie(
  props: ComponentProps<typeof LazyPie> & { height?: number },
) {
  return (
    <SectionErrorBoundary title="饼图渲染异常">
      <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyPie {...props} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

export function AsyncDualAxes(
  props: ComponentProps<typeof LazyDualAxes> & { height?: number },
) {
  return (
    <SectionErrorBoundary title="双轴图表渲染异常">
      <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyDualAxes {...props} />
      </Suspense>
    </SectionErrorBoundary>
  );
}
