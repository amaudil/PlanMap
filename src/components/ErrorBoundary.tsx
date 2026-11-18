import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Error inesperado en la aplicación.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0C0B] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#161A18] border border-white/10 rounded-3xl p-6 text-center shadow-2xl">
            <div className="text-3xl mb-3">⚡</div>
            <h2 className="text-lg font-extrabold text-[#CCFF00] mb-2">
              Sincronización Interrumpida
            </h2>
            <p className="text-sm text-[#8A9590] mb-4 break-words">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-2xl bg-[#CCFF00] text-[#0A0C0B] font-extrabold text-sm cursor-pointer"
            >
              Recargar Sala
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
