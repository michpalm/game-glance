/**
 * Steam's own gamepad focus. Steam's controller input follows its navigation tree (`FocusNavController`, probed on the
 * Ally), not the page's DOM focus: normally Steam copies a DOM `focus()` into it, but while Steam's window has no system
 * focus (seen on the Ally after Steam restarted: no Steam window focused, the controller still driving Big Picture) it
 * does not, so a focus move made in code (L1/R1 on Home's tabs) changed the DOM focus and nothing on screen. Asking the
 * element's own navigation node to take focus is what Steam's D-pad does, and works either way.
 */

interface NavNode {
    m_element?: unknown;
    m_rgChildren?: unknown;
    BTakeFocus?(source: number): unknown;
}

interface NavController {
    GetActiveContext?(): unknown;
    GetDefaultContext?(): unknown;
}

/** Steam's focus source for a gamepad (what its own navigation passes). */
const GAMEPAD_SOURCE = 1;
const MAX_DEPTH = 80;

/** The node in Steam's navigation trees whose element is `el` (depth first, bounded); null when there is none. Pure. */
export function findNavNode(roots: Iterable<unknown>, el: unknown): NavNode | null {
    const visit = (n: unknown, depth: number): NavNode | null => {
        if (!n || typeof n !== 'object' || depth > MAX_DEPTH) return null;
        const nav = n as NavNode;
        if (nav.m_element === el) return nav;
        const children = nav.m_rgChildren;
        if (!Array.isArray(children)) return null;
        for (const child of children) {
            const hit = visit(child, depth + 1);
            if (hit) return hit;
        }
        return null;
    };
    for (const root of roots) {
        const hit = visit(root, 0);
        if (hit) return hit;
    }
    return null;
}

/** The roots of the navigation trees in Steam's active (else default) context. */
function treeRoots(controller: NavController): unknown[] {
    const context = (controller.GetActiveContext?.() ?? controller.GetDefaultContext?.()) as { m_rgGamepadNavigationTrees?: unknown } | null | undefined;
    const trees = context?.m_rgGamepadNavigationTrees;
    return Array.isArray(trees) ? trees.map((t) => (t as { m_Root?: unknown } | null)?.m_Root) : [];
}

/** Moves Steam's gamepad focus to `el`'s node. False (and nothing thrown) without Steam's controller or the node. */
export function takeSteamFocus(el: unknown, controller: NavController | undefined = (globalThis as { FocusNavController?: NavController }).FocusNavController): boolean {
    try {
        if (!controller) return false;
        const target = findNavNode(treeRoots(controller), el);
        return typeof target?.BTakeFocus === 'function' ? target.BTakeFocus(GAMEPAD_SOURCE) === true : false;
    } catch {
        return false;
    }
}
