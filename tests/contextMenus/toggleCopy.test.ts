import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const src = (p: string) => readFileSync(new URL(`../../src/menu/components/${p}`, import.meta.url), 'utf8');
// Steam's Settings are no longer restyled (spec 2026-11-13-console-settings-design): the option governs the context menus only.
it('names only the context menus in the Restyle toggle, in the menu and the Decky panel', () => {
    expect(src('GameGlancePages.tsx')).toContain('label="Restyle Steam\'s menus" description="Apply the Game Glance theme to Steam\'s context menus."');
    expect(src('MenuPreferences.tsx')).toContain('label="Restyle Steam\'s menus" description="Apply the Game Glance theme to Steam\'s context menus. Requires the Game Glance menu."');
    expect(src('GameGlancePages.tsx') + src('MenuPreferences.tsx')).not.toContain('Steam Settings');
});
