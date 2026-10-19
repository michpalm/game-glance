import { DialogButton } from '@decky/ui';
import type { ReactNode } from 'react';
export function MenuAction({ id, children, onAction, className = '', selected, disabled = false }: { id: string; children: ReactNode; onAction(): void; className?: string; selected?: boolean; disabled?: boolean }) {
    return <DialogButton className={`gg-menu-action ${className}`} data-gg-focus={id} aria-pressed={selected} disabled={disabled} onClick={onAction}>{children}</DialogButton>;
}
