import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SectionErrorBoundary } from './section-error-boundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Component Error Test');
  }
  return <div>Normal Content</div>;
}

describe('SectionErrorBoundary', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders children normally when no error occurs', () => {
    render(
      <SectionErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </SectionErrorBoundary>,
    );
    expect(screen.queryByText('Normal Content')).not.toBeNull();
  });

  test('captures error and displays fallback UI when child throws', () => {
    const originalError = console.error;
    console.error = () => {};

    render(
      <SectionErrorBoundary title="Custom Section Error">
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>,
    );

    expect(screen.queryByText('Custom Section Error')).not.toBeNull();
    expect(screen.queryByText('Component Error Test')).not.toBeNull();

    console.error = originalError;
  });

  test('invokes onReset and allows retry when retry button is clicked', () => {
    const originalError = console.error;
    console.error = () => {};

    const onResetMock = mock(() => {});

    render(
      <SectionErrorBoundary title="Section Error" onReset={onResetMock}>
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>,
    );

    const retryBtn = screen.getByText('重试组件').closest('button')!;
    fireEvent.click(retryBtn);

    expect(onResetMock).toHaveBeenCalledTimes(1);

    console.error = originalError;
  });
});
