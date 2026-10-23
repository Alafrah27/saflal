import { Component } from 'react';
import CrashScreen from './ui/CrashScreen';

/**
 * ErrorBoundary - Pure React error boundary
 * Catches render errors and shows a CrashScreen fallback
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log to console in development
        if (__DEV__) {
            console.error('ErrorBoundary caught:', error, errorInfo?.componentStack);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return <CrashScreen onRetry={this.handleRetry} error={this.state.error} />;
        }
        return this.props.children;
    }
}
