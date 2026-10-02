import { Component, ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        console.error(`${LOG_PREFIX} game page render failed`, error);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}
