import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NexusRank could not render this view.', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <main className="p-8 space-y-4" role="alert">
        <h1 className="text-lg font-semibold">This view could not load</h1>
        <p>Your saved scans are still available. Reload the app to try again.</p>
        <a className="text-blue-600 underline" href="/">Return to New Scan</a>
      </main>;
    }
    return this.props.children;
  }
}
