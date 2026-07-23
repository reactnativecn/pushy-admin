import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { DangerousConfirmModal } from './dangerous-confirm-modal';

describe('DangerousConfirmModal', () => {
  afterEach(() => {
    cleanup();
  });

  test('does not render content when closed', () => {
    render(
      <ConfigProvider>
        <DangerousConfirmModal
          open={false}
          title="Test Title"
          description="Test Desc"
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </ConfigProvider>,
    );
    expect(screen.queryByText('Test Title')).toBeNull();
  });

  test('renders title, warning message and input when open', () => {
    render(
      <ConfigProvider>
        <DangerousConfirmModal
          open={true}
          title="Test Title"
          description="Test Desc"
          expectedConfirmText="my-app"
          dangerButtonText="Confirm Delete"
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </ConfigProvider>,
    );
    expect(screen.getByText('Test Title')).not.toBeNull();
    expect(screen.getByText('Test Desc')).not.toBeNull();
    expect(screen.getByText('my-app')).not.toBeNull();
  });

  test('disables confirm button when text does not match', () => {
    render(
      <ConfigProvider>
        <DangerousConfirmModal
          open={true}
          title="Delete App"
          description="Warning"
          expectedConfirmText="my-app"
          dangerButtonText="Confirm Delete"
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </ConfigProvider>,
    );

    const confirmBtn = screen.getByText('Confirm Delete').closest('button');
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong-name' } });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });

  test('enables confirm button and triggers onConfirm when text matches exactly (with whitespace trimming)', () => {
    const onConfirmMock = mock(() => {});
    render(
      <ConfigProvider>
        <DangerousConfirmModal
          open={true}
          title="Delete App"
          description="Warning"
          expectedConfirmText="my-app"
          dangerButtonText="Confirm Delete"
          onCancel={() => {}}
          onConfirm={onConfirmMock}
        />
      </ConfigProvider>,
    );

    const confirmBtn = screen.getByText('Confirm Delete').closest('button')!;
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '  my-app  ' } });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(confirmBtn);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });
});
