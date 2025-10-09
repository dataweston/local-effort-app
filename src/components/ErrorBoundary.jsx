import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
    this.setState({ info });
  }

  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, Arial', color: '#111' }}>
          <h1>Application error</h1>
          <p style={{ whiteSpace: 'pre-wrap' }}>{String(error && (error.message || error))}</p>
          {info && info.componentStack && (
            <details style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
              <summary>Component stack</summary>
              <div>{info.componentStack}</div>
            </details>
          )}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
