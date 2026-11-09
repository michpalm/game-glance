import { DialogButton } from '@decky/ui';
import type { ReactNode } from 'react';
export function MenuAction({ id, children, onAction, className = '', selected, ariaLabel, disabled = false, busy, frostRegion }: { id: string; children: ReactNode; onAction(): void; className?: string; selected?: boolean; ariaLabel?: string; disabled?: boolean; busy?: boolean; frostRegion?:'notifications' }) {
    return <DialogButton className={`gg-menu-action ${className}`} data-gg-focus={id} data-gg-frost-region={frostRegion} aria-pressed={selected} aria-label={ariaLabel} aria-busy={busy} disabled={disabled} onClick={onAction}>{children}</DialogButton>;
}
