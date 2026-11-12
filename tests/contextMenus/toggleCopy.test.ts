import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const src = (p: string) => readFileSync(new URL(`../../src/menu/components/${p}`, import.meta.url), 'utf8');
it('names the context menus in the Restyle toggle, in the menu and the Decky panel', () => {
    expect(src('GameGlancePages.tsx')).toContain('label="Restyle Steam Settings and menus" description="Apply the Game Glance theme to Steam Settings and to Steam\'s context menus."');
    expect(src('MenuPreferences.tsx')).toContain('label="Restyle Steam Settings and menus" description="Apply the Game Glance theme to Steam Settings and to Steam\'s context menus. Requires the Game Glance menu."');
});
