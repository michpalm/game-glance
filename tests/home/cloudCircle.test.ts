import { expect, it, vi } from 'vitest';
vi.mock('../../src/home/steamIcons', () => ({ steamCheckIcon: () => null, steamControllerIcon: () => null, steamGearIcon: () => null, steamStreamMenuClasses: () => null }));
import { cloudCircleClass } from '../../src/home/ActionRow';
import type { CloudState } from '../../src/home/cloud';

const cloud = (extra: Partial<CloudState> = {}) => ({ status: 0, tone: 'ok', icon: {}, action: 'none', label: 'Cloud saves', ...extra }) as CloudState;

it('draws every game’s cloud circle in Game Glance’s style, Unifideck games too', () => {
    expect(cloudCircleClass(cloud())).toBe('gh-btn-circle gh-btn-cloud gh-cloud-ok');
    const unifideck = cloud({ tone: 'busy', unifideck: { icon: 'sync', ring: '#3b82f6', dim: true, breathe: true } } as Partial<CloudState>);
    expect(cloudCircleClass(unifideck)).toBe('gh-btn-circle gh-btn-cloud gh-cloud-busy');
});
