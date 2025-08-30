import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 bg-yellow-50 text-center">
          <h3 className="font-bold">Something failed to load.</h3>
          <p className="text-sm text-gray-700 mt-2">{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
