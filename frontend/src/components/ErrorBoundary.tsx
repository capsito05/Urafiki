import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Crash capturé :', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>Oups, un problème est survenu 😕</h2>
          <p>Cette question n'a pas pu s'afficher correctement. Aucune donnée n'a été perdue.</p>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.href = '/accueil';
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
