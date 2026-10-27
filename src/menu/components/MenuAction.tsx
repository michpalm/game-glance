import { DialogButton } from '@decky/ui';
import type { ReactNode } from 'react';
export function MenuAction({ id, children, onAction, className = '', selected, ariaLabel, disabled = false, frostRegion }: { id: string; children: ReactNode; onAction(): void; className?: string; selected?: boolean; ariaLabel?: string; disabled?: boolean; frostRegion?:'notifications' }) {
    return <DialogButton className={`gg-menu-action ${className}`} data-gg-focus={id} data-gg-frost-region={frostRegion} aria-pressed={selected} aria-label={ariaLabel} disabled={disabled} onClick={onAction}>{children}</DialogButton>;
}
