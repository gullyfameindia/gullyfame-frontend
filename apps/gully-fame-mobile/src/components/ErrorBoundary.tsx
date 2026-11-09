/**
 * Error Boundary Component
 * Catches component errors and displays user-friendly error UI with recovery options
 */

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { ErrorResponse } from '@/api/errorHandler';
import { reportError } from '@/utils/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const getToastColor = (_type: ErrorResponse['type']): string => '#EC9A15';

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    reportError(error, 'error-boundary');
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} onReset={this.resetError} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  onGoHome?: () => void;
}

export function ErrorFallback({ error, onReset, onGoHome }: ErrorFallbackProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.errorContent}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Oops, Something Went Wrong</Text>
          <Text style={styles.message}>We encountered an unexpected error. Please try again.</Text>

          {__DEV__ && error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText} numberOfLines={3}>
                {error.message}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onReset}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {onGoHome && (
          <TouchableOpacity style={[styles.button, styles.homeButton]} onPress={onGoHome}>
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Error Toast Component
 * Displays error notifications at the bottom of screen
 */
interface ErrorToastProps {
  error: ErrorResponse | null;
  visible: boolean;
  duration?: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorToast({
  error,
  visible,
  duration = 5000,
  onDismiss,
  onRetry,
}: ErrorToastProps) {
  const [show, setShow] = React.useState(visible);

  React.useEffect(() => {
    setShow(visible);

    if (visible && !error?.isRetryable) {
      const timeout = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [visible, error, duration, onDismiss]);

  if (!show || !error) return null;

  return (
    <View style={[styles.toast, { backgroundColor: getToastColor(error.type) }]}>
      <View style={styles.toastContent}>
        <Text style={styles.toastMessage}>{error.userMessage}</Text>
        {error.suggestedAction && error.isRetryable && onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.toastRetryButton}>
            <Text style={styles.toastRetryText}>{error.suggestedAction}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={() => { setShow(false); onDismiss?.(); }} style={styles.toastClose}>
        <Text style={styles.toastCloseText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3C2610',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    marginTop: 16,
    maxWidth: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#CCC',
    lineHeight: 20,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#EC9A15',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  homeButton: {
    backgroundColor: 'rgba(236, 154, 21, 0.2)',
    borderWidth: 1,
    borderColor: '#EC9A15',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EC9A15',
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastContent: {
    flex: 1,
    marginRight: 12,
  },
  toastMessage: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  toastRetryButton: {
    marginTop: 8,
  },
  toastRetryText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  toastClose: {
    padding: 8,
  },
  toastCloseText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
});


export default ErrorBoundary;
