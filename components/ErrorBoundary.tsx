"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="bento-card h-full flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            일시적인 오류가 발생했습니다.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
