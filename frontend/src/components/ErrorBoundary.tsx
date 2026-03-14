import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: 32, textAlign: 'center', borderRadius: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          fontFamily: "'DM Mono', monospace",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "'Bebas Neue', Impact", fontSize: 20, letterSpacing: 2, color: '#f87171', marginBottom: 8 }}>
            SOMETHING WENT WRONG
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: "'Bebas Neue', Impact", letterSpacing: 2 }}
          >
            TRY AGAIN
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
