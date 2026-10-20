import { beforePatch } from '@decky/ui';

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

interface NavTree {
    m_Root?: unknown;
    GetLastFocusedNode?(): NavNode | null;
}
interface NavContext {
    m_rgGamepadNavigationTrees?: unknown;
    BIsGamepadInputSuppressed?(): boolean;
}

interface NavController {
    GetActiveContext?(): NavContext | null;
    GetDefaultContext?(): NavContext | null;
    GetActiveNavTree?(): NavTree | null;
    GetEventTarget?(button: number, source?: number, down?: boolean): unknown;
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

/**
 * After B, Home can have DOM focus and the gpfocus class while Steam briefly loses its focused navigation node
 * during the route/focus handoff. Steam then spends the next D-pad press finding a node instead of delivering it.
 * During the return's settling period, repair immediately BEFORE Steam chooses the target of a Left/Right press.
 * A timer is insufficient: focus can clear between ticks, and GetEventTarget then restores focus but drops that press.
 * Also repair a stale node outside Home when DOM focus is already on a Home control (the outgoing page may still be
 * connected). Remember the last Home control if DOM focus moves to its neutral WindowFocus ancestor. A valid Home
 * focus, another DOM control/window, an opening page, suppressed input and menus in another tree are left alone. The original dispatcher
 * still runs once with the same arguments; no controller events are replayed.
 */
export function keepSteamFocus(root: HTMLElement | null, durationMs: number, controller: NavController | undefined = (globalThis as { FocusNavController?: NavController }).FocusNavController): () => void {
    if (!root || !controller?.GetActiveNavTree || !controller.GetEventTarget) return () => undefined;
    let stopped = false;
    const doc = root.ownerDocument;
    let remembered = doc.activeElement && root.contains(doc.activeElement) ? doc.activeElement : null;
    const onFocus = (event: Event) => {
        const el = event.target as Element | null;
        if (el && root.contains(el)) remembered = el;
    };
    const repair = () => {
        if (stopped) return;
        try {
            const el = doc.activeElement;
            if (!root.isConnected || root.hasAttribute('data-gh-opening') || !doc.hasFocus()) return;
            const domInHome = !!el && root.contains(el);
            if (domInHome) remembered = el;
            else if (!el?.contains?.(root)) return;
            if (!remembered?.isConnected || !root.contains(remembered)) return;
            if (controller.GetActiveContext?.()?.BIsGamepadInputSuppressed?.()) return;
            const tree = controller.GetActiveNavTree?.();
            if (!tree?.GetLastFocusedNode) return;
            const focused = tree.GetLastFocusedNode()?.m_element as Element | null | undefined;
            // A connected node can still belong to the departing page. Only override it when DOM focus is
            // explicitly back inside Home; a neutral window ancestor alone must not displace a live control.
            if (focused?.isConnected && (root.contains(focused) || !domInHome)) return;
            const target = findNavNode([tree.m_Root], remembered);
            target?.BTakeFocus?.(GAMEPAD_SOURCE);
        } catch {
            // Steam's window or navigation tree may have left while Home was restoring.
        }
    };
    let patch: ReturnType<typeof beforePatch>;
    try {
        patch = beforePatch(controller, 'GetEventTarget', ([button, , down]) => {
            if (down === true && (button === 11 || button === 12)) repair();
        });
    } catch {
        return () => undefined;
    }
    doc.addEventListener('focusin', onFocus, { capture: true });
    const stop = () => {
        if (stopped) return;
        stopped = true;
        clearTimeout(end);
        doc.removeEventListener('focusin', onFocus, { capture: true });
        try { patch.unpatch(); } catch { /* controller already gone */ }
    };
    const end = setTimeout(stop, durationMs);
    return stop;
}
