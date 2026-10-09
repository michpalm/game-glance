import { UNIFIDECK_META } from '../styles/themeCss';

/**
 * Unifideck's own word for its size item, so its plugin does the translating (it has 16 languages of its own, separate from
 * Steam's; nothing of it is reachable from outside). Its meta row stays in the page, hidden by our theme, with the words
 * already translated: the first item is the size ("Installed size" for an installed game, "Space required" for one that is
 * not), a label div then a value div. Read from there; nothing when the row is not (yet) in the page or its shape differs.
 */
interface TextNode {
    textContent: string | null;
}
interface ItemLike {
    children: ArrayLike<TextNode>;
}

const MAX_LABEL = 48;

/** The label of one meta item (a label followed by a value), or null when it does not look like that. Pure. */
export function labelOfItem(item: ItemLike | null | undefined): string | null {
    try {
        if (!item || item.children.length !== 2) return null;
        const label = (item.children[0].textContent ?? '').trim();
        const value = (item.children[1].textContent ?? '').trim();
        if (label === '' || value === '' || label.length > MAX_LABEL || label === value) return null;
        return label;
    } catch {
        return null;
    }
}

/** Unifideck's size label from the page under `root`, or null. Never throws. */
export function readSizeLabel(root: ParentNode | null | undefined): string | null {
    try {
        const item = root?.querySelector(`${UNIFIDECK_META} > :first-child`) as ItemLike | null | undefined;
        return labelOfItem(item);
    } catch {
        return null;
    }
}
