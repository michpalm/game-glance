import { Component, ReactElement, ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { useSettings } from '../data/settings';
import { SpotlightLibrary } from './SpotlightLibrary';

let logged = false;

class LibraryErrorBoundary extends Component<{ fallback: ReactElement; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        if (logged) return;
        logged = true;
        console.error(`${LOG_PREFIX} Spotlight Library render failed; showing Steam's Library`, error);
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

export function LibraryGate({ fallback }: { fallback: ReactElement }) {
    const settings = useSettings();
    if (!settings.spotlightLibrary) return fallback;

    return (
        <LibraryErrorBoundary fallback={fallback}>
            <SpotlightLibrary />
        </LibraryErrorBoundary>
    );
}
