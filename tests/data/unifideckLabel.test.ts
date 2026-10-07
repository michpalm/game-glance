import { describe, expect, it } from 'vitest';
import { labelOfItem } from '../../src/data/unifideckLabel';
import { sizeStat } from '../../src/logic/sizeStat';

const item = (...texts: Array<string | null>) => ({ children: texts.map((textContent) => ({ textContent })) });

describe('labelOfItem (Unifideck’s own word for its size item)', () => {
    it('is the label of a label-then-value item, in whatever language Unifideck speaks', () => {
        expect(labelOfItem(item('Tamaño instalado', '5.4 GB'))).toBe('Tamaño instalado');
        expect(labelOfItem(item(' Espacio requerido ', '869 MB'))).toBe('Espacio requerido');
        expect(labelOfItem(item('インストールサイズ', '3.2 GB'))).toBe('インストールサイズ');
    });
    it('is null when the item does not have that shape: nothing there, other child counts, empty or long text', () => {
        expect(labelOfItem(null)).toBeNull();
        expect(labelOfItem(undefined)).toBeNull();
        expect(labelOfItem(item('only one'))).toBeNull();
        expect(labelOfItem(item('a', 'b', 'c'))).toBeNull();
        expect(labelOfItem(item('', '5 GB'))).toBeNull();
        expect(labelOfItem(item('Size', ''))).toBeNull();
        expect(labelOfItem(item(null, '5 GB'))).toBeNull();
        expect(labelOfItem(item('x'.repeat(80), '5 GB'))).toBeNull();
        expect(labelOfItem(item('5 GB', '5 GB'))).toBeNull();
    });
});

describe('sizeStat with Unifideck’s own label', () => {
    const GB = 1024 ** 3;
    it('uses it when known; otherwise our English', () => {
        expect(sizeStat(3.2 * GB, false, 'es-ES', 'Espacio requerido')).toEqual({ key: 'size', label: 'Espacio requerido', value: '3,2 GB' });
        expect(sizeStat(3.2 * GB, true, 'en-US', null)?.label).toBe('Installed size');
        expect(sizeStat(3.2 * GB, false, 'en-US', '')?.label).toBe('Install size');
    });
});
