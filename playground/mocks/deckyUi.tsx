// Mock implementation of @decky/ui for local browser preview
import React from 'react';

export const staticClasses = {
    Title: 'decky-title',
};

export const appDetailsClasses = {
    InnerContainer: 'InnerContainer',
    AppDetailsOverviewPanel: 'AppDetailsOverviewPanel',
};

export const appDetailsHeaderClasses = {
    TopCapsule: 'TopCapsule',
    BoxSizer: 'BoxSizer',
};

export const playSectionClasses = {
    StatusAndStats: 'StatusAndStats',
    MenuButton: 'MenuButton',
    CloudStatusRow: 'CloudStatusRow',
    CloudStatusIcon: 'CloudStatusIcon',
};

const MOCK_MODULES: Record<string, any>[] = [
    {
        AppDetailsRoot: 'AppDetailsRoot',
        PlaySection: 'PlaySection',
        ActionRow: 'ActionRow',
        ActionButtonAndStatusPanel: 'ActionButtonAndStatusPanel',
        AppButtons: 'AppButtons',
        AppDetailsContainer: 'AppDetailsContainer',
    },
    {
        Backdrop: 'Backdrop',
        BackdropGlass: 'BackdropGlass',
    },
    {
        Container: 'LaunchContainer',
        ConfigurationHeader: 'ConfigurationHeader',
        ControlOverviewContainer: 'ControlOverviewContainer',
        LaunchStatus: 'LaunchStatus',
    },
];

export function findClassModule(filter: (m: Record<string, string>) => boolean) {
    for (const mod of MOCK_MODULES) {
        try {
            if (filter(mod)) return mod;
        } catch {}
    }
    return {};
}

export function findModule() {
    return null;
}

export function findInReactTree(tree: any, predicate: (x: any) => boolean): any {
    return null;
}

export function createReactTreePatcher() {
    return () => {};
}

export function afterPatch() {}

export const Navigation = {
    Navigate: (path: string) => console.log('[Navigation.Navigate]', path),
    NavigateToExternalWeb: (url: string) => window.open(url, '_blank'),
    NavigateToSteamWeb: (url: string) => window.open(url, '_blank'),
};

export const Focusable: React.FC<any> = ({ children, className = '', onOKButton, onCancelButton, onButtonDown, ...rest }) => {
    return (
        <div
            tabIndex={0}
            className={`Focusable ${className}`}
            onClick={onOKButton}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && onOKButton) onOKButton(e);
                if (e.key === 'Escape' && onCancelButton) onCancelButton(e);
            }}
            {...rest}
        >
            {children}
        </div>
    );
};

export const PanelSection: React.FC<any> = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
        {title && <div style={{ fontSize: 13, textTransform: 'uppercase', color: '#8f98a0', fontWeight: 600, marginBottom: 8 }}>{title}</div>}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: 12 }}>{children}</div>
    </div>
);

export const PanelSectionRow: React.FC<any> = ({ children }) => (
    <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>{children}</div>
);

export const ToggleField: React.FC<any> = ({ label, description, checked, onChange, disabled }) => (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
        <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
            {description && <div style={{ fontSize: 12, color: '#8f98a0', marginTop: 2 }}>{description}</div>}
        </div>
        <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#1a9fff' }}
        />
    </label>
);

export const ButtonItem: React.FC<any> = ({ children, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            background: 'linear-gradient(90deg, #1a9fff, #1a70ff)',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 13,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            width: '100%',
            fontWeight: 500,
        }}
    >
        {children}
    </button>
);

export const TextField: React.FC<any> = ({ label, value, onChange, placeholder, disabled }) => (
    <div>
        {label && <div style={{ fontSize: 12, color: '#8f98a0', marginBottom: 4 }}>{label}</div>}
        <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: 'white',
                padding: '6px 10px',
                fontSize: 13,
                boxSizing: 'border-box',
            }}
        />
    </div>
);

export const ConfirmModal: React.FC<any> = () => null;
export const showModal = () => {};
export const showContextMenu = () => {};
