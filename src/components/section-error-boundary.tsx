import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';

interface Props {
  children: ReactNode;
  title?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SectionErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          title={this.props.title || i18n.t('error_boundary.section_title')}
          description={
            <div style={{ marginTop: 8 }}>
              <p
                style={{
                  margin: '4px 0',
                  fontSize: 13,
                  color: 'rgba(0, 0, 0, 0.65)',
                }}
              >
                {this.state.error?.message ||
                  i18n.t('error_boundary.section_unknown_error')}
              </p>
              <Button
                size="small"
                type="primary"
                danger
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
                style={{ marginTop: 8 }}
              >
                {i18n.t('error_boundary.retry_section')}
              </Button>
            </div>
          }
          style={{ margin: '12px 0' }}
        />
      );
    }

    return this.props.children;
  }
}
