export type StoreIconKey = 'steam' | 'gog' | 'epic' | 'amazon' | 'ubisoft' | 'xbox' | 'battlenet' | 'heroic' | 'generic';

// Labels come from getSourceLabel: 'Steam', the backend's STORE_LABELS, or heroicStoreLabel.
const BY_LABEL: Record<string, StoreIconKey> = {
    steam: 'steam',
    gog: 'gog',
    epic: 'epic',
    amazon: 'amazon',
    ubisoft: 'ubisoft',
    'xbox cloud': 'xbox',
    'battle.net': 'battlenet',
    heroic: 'heroic',
};

/** Which store icon to show next to a source label; 'generic' for other shortcuts and unknown stores. */
export function storeIconKey(label: string): StoreIconKey {
    return BY_LABEL[label.trim().toLowerCase()] ?? 'generic';
}
